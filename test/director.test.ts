import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';
import { initDatabase } from '../src/db.ts';
import {
  validateDirectorOutput,
  buildDirectorPrompt,
  canCallDirector,
  getRecentMemories,
  savePersonaMemories,
  recordDirectorRun,
  getDirectorStatsToday,
  runDirectorTick,
} from '../src/director.ts';
import type { Persona, DirectorConfig } from '../src/config.ts';
import { createServer } from '../src/server.ts';

const SAMPLE_PERSONAS: Persona[] = [
  { id: 'greg', name: 'Greg', role: 'Lead', engine: 'Claude', color: '#6d4fd8', desk_spot: 'desk_greg' },
  { id: 'alex', name: 'Alex', role: 'Teknis', engine: 'AGY', color: '#2f6fd6', desk_spot: 'desk_alex' },
  { id: 'codex', name: 'Codex', role: 'Kreatif', engine: 'Codex', color: '#10a37f', desk_spot: 'desk_codex' },
];

const VALID_SPOTS = ['desk_greg', 'desk_alex', 'meditation_1', 'sunken_tatami_1', 'ps5_sofa_1'];
const VALID_PERSONA_IDS = new Set(SAMPLE_PERSONAS.map(p => p.id));
const VALID_SPOTS_SET = new Set(VALID_SPOTS);

test('validateDirectorOutput: validasi skema output Director', () => {
  // 1. Valid payload
  const valid = {
    scenes: [
      {
        actor: 'greg',
        action: 'chat',
        spot: 'sunken_tatami_1',
        with: 'alex',
        line: 'Bagaimana progres arsitektur Three.js hari ini?',
        duration_s: 20,
      },
      {
        actor: 'codex',
        action: 'sit',
        spot: 'meditation_1',
        line: 'Hening itu menenangkan.',
        duration_s: 30,
      },
    ],
    memory_notes: [
      { persona: 'greg', note: 'Suka minum teh hijau di sunken tatami' },
    ],
  };

  const res = validateDirectorOutput(valid, VALID_PERSONA_IDS, VALID_SPOTS_SET);
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.data.scenes.length, 2);
    assert.equal(res.data.scenes[0].actor, 'greg');
    assert.equal(res.data.scenes[0].duration_s, 20);
    assert.equal(res.data.memory_notes.length, 1);
  }

  // 2. Reject unknown actor
  const invalidActor = {
    scenes: [{ actor: 'hacker', action: 'sit', spot: 'sunken_tatami_1' }],
  };
  assert.equal(validateDirectorOutput(invalidActor, VALID_PERSONA_IDS, VALID_SPOTS_SET).ok, false);

  // 3. Reject invalid spot
  const invalidSpot = {
    scenes: [{ actor: 'alex', action: 'walk', spot: 'mars_base' }],
  };
  assert.equal(validateDirectorOutput(invalidSpot, VALID_PERSONA_IDS, VALID_SPOTS_SET).ok, false);

  // 4. Reject line > 80 chars
  const longLine = {
    scenes: [{
      actor: 'greg',
      action: 'say',
      line: 'Kalimat ini sengaja dibuat sangat panjang sekali melebihi delapan puluh karakter untuk memastikan sistem menolak dialog yang terlalu panjang.',
    }],
  };
  assert.equal(validateDirectorOutput(longLine, VALID_PERSONA_IDS, VALID_SPOTS_SET).ok, false);

  // 5. Reject invalid action
  const invalidAction = {
    scenes: [{ actor: 'alex', action: 'dance' }],
  };
  assert.equal(validateDirectorOutput(invalidAction, VALID_PERSONA_IDS, VALID_SPOTS_SET).ok, false);
});

test('buildDirectorPrompt: perlindungan privasi (tanpa membocorkan judul task/prompt)', () => {
  const { system, user } = buildDirectorPrompt(
    SAMPLE_PERSONAS,
    { greg: 3, alex: 5 },
    [{ persona: 'alex', note: 'Suka teh oolong' }],
    VALID_SPOTS
  );

  // Verifikasi konten aman ada
  assert.ok(system.includes('Director'));
  assert.ok(user.includes('Greg'));
  assert.ok(user.includes('Alex'));
  assert.ok(user.includes('Menyelesaikan 3 tugas hari ini'));
  assert.ok(user.includes('Suka teh oolong'));

  // Verifikasi tidak ada kebocoran task internal rahasia
  const forbiddenPatterns = ['INTERNAL', 'token', 'password', 'secret', 'prompt_body'];
  for (const p of forbiddenPatterns) {
    assert.ok(!user.includes(p), `User prompt tidak boleh memuat ${p}`);
  }
});

test('canCallDirector: guardrails interval, budget, dan status idle', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kantor-dir-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const keyFile = path.join(tmpDir, 'key.txt');
  fs.writeFileSync(keyFile, 'sk-test-mock-key\n');

  const db = initDatabase(dbPath);

  const baseConfig: DirectorConfig = {
    enabled: true,
    apiKeyFile: keyFile,
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    minIntervalMin: 10,
    dailyBudgetUsd: 0.05,
    maxDailyCalls: 60,
  };

  const now = new Date('2026-11-08T12:00:00Z');

  // 1. Enabled tapi ada yang working -> tolak
  assert.equal(canCallDirector(db, baseConfig, false, now).allowed, false);

  // 2. Disabled -> tolak
  assert.equal(canCallDirector(db, { ...baseConfig, enabled: false }, true, now).allowed, false);

  // 3. Key file tidak ada -> tolak
  assert.equal(canCallDirector(db, { ...baseConfig, apiKeyFile: '/nonexistent/key' }, true, now).allowed, false);

  // 4. Semua syarat terpenuhi -> lolos
  assert.equal(canCallDirector(db, baseConfig, true, now).allowed, true);

  // 5. Catat run baru, lalu cek interval 5 menit kemudian -> tolak karena < 10 menit
  recordDirectorRun(db, {
    ts: '2026-11-08T12:00:00Z',
    model: 'deepseek-chat',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.001,
    ok: true,
  });

  const fiveMinLater = new Date('2026-11-08T12:05:00Z');
  assert.equal(canCallDirector(db, baseConfig, true, fiveMinLater).allowed, false);

  const fifteenMinLater = new Date('2026-11-08T12:15:00Z');
  assert.equal(canCallDirector(db, baseConfig, true, fifteenMinLater).allowed, true);

  // 6. Batas budget harian terlampaui
  recordDirectorRun(db, {
    ts: '2026-11-08T12:15:00Z',
    model: 'deepseek-chat',
    inputTokens: 100,
    outputTokens: 50,
    costUsd: 0.06,
    ok: true,
  });
  const sixteenMinLater = new Date('2026-11-08T12:26:00Z');
  const budgetCheck = canCallDirector(db, baseConfig, true, sixteenMinLater);
  assert.equal(budgetCheck.allowed, false);
  assert.ok(budgetCheck.reason?.includes('anggaran'));

  // Bersihkan
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('runDirectorTick: eksekusi dengan mock fetch dan penyimpanan memori', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kantor-dir-tick-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const keyFile = path.join(tmpDir, 'key.txt');
  fs.writeFileSync(keyFile, 'sk-test-key-ok');

  const db = initDatabase(dbPath);

  const config: DirectorConfig = {
    enabled: true,
    apiKeyFile: keyFile,
    baseUrl: 'https://mock.director.local',
    model: 'mock-model',
    minIntervalMin: 10,
    dailyBudgetUsd: 0.05,
    maxDailyCalls: 60,
  };

  // Mock fetch berhasil
  const mockFetchSuccess: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                scenes: [
                  {
                    actor: 'alex',
                    action: 'coffee',
                    spot: 'sunken_tatami_1',
                    line: 'Kopi hangat setelah deploy terasa nikmat.',
                    duration_s: 25,
                  },
                ],
                memory_notes: [
                  { persona: 'alex', note: 'Selalu minum kopi setelah deploy sukses' },
                ],
              }),
            },
          },
        ],
        usage: { prompt_tokens: 150, completion_tokens: 60 },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const result = await runDirectorTick(
    db,
    config,
    SAMPLE_PERSONAS,
    VALID_SPOTS,
    { alex: 2 },
    true,
    mockFetchSuccess
  );

  assert.equal(result.ok, true);
  assert.equal(result.fallback, false);
  assert.equal(result.output?.scenes.length, 1);
  assert.equal(result.output?.scenes[0].actor, 'alex');

  // Verifikasi memori tersimpan di DB
  const memories = getRecentMemories(db, 5);
  assert.equal(memories.length, 1);
  assert.equal(memories[0].persona, 'alex');
  assert.equal(memories[0].note, 'Selalu minum kopi setelah deploy sukses');

  // Verifikasi log run tercatat
  const stats = getDirectorStatsToday(db);
  assert.equal(stats.callsToday, 1);
  assert.equal(stats.lastOk, true);

  // Bersihkan
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('Endpoint GET /api/director mengembalikan status dan memori', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kantor-endpoint-dir-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const server = createServer({
    port: 0,
    dbPath,
    director: {
      enabled: false,
      apiKeyFile: null,
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
      minIntervalMin: 10,
      dailyBudgetUsd: 0.05,
      maxDailyCalls: 60,
    },
  });

  await new Promise<void>(resolve => server.listen(0, resolve));
  const addr = server.address() as { port: number };

  const res = await fetch(`http://127.0.0.1:${addr.port}/api/director`);
  assert.equal(res.status, 200);
  const data = await res.json() as {
    enabled: boolean;
    model: string;
    stats: { callsToday: number };
    recent_memories: unknown[];
  };

  assert.equal(data.enabled, false);
  assert.equal(data.model, 'deepseek-chat');
  assert.equal(data.stats.callsToday, 0);
  assert.ok(Array.isArray(data.recent_memories));

  await server.closeAll();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
