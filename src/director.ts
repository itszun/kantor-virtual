import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import type { Persona, DirectorConfig } from './config.ts';

export const VALID_ACTIONS = new Set([
  'walk',
  'sit',
  'say',
  'chat',
  'coffee',
  'watch_tv',
  'look_window',
]);

export interface SceneAction {
  actor: string;
  action: 'walk' | 'sit' | 'say' | 'chat' | 'coffee' | 'watch_tv' | 'look_window';
  spot?: string;
  with?: string;
  line?: string;
  duration_s?: number;
}

export interface MemoryNote {
  persona: string;
  note: string;
}

export interface DirectorOutput {
  scenes: SceneAction[];
  memory_notes: MemoryNote[];
}

export interface DirectorStats {
  callsToday: number;
  costUsdToday: number;
  lastCallTs: string | null;
  lastOk: boolean;
  lastError: string | null;
}

export function getRecentMemories(
  db: DatabaseSync,
  limit = 10
): Array<{ id: number; ts: string; persona: string; note: string }> {
  try {
    const stmt = db.prepare(`
      SELECT id, ts, persona, note
      FROM persona_memory
      ORDER BY id DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as Array<{ id: number; ts: string; persona: string; note: string }>;
    return rows.reverse();
  } catch {
    return [];
  }
}

export function savePersonaMemories(db: DatabaseSync, memories: MemoryNote[]): void {
  if (!memories || memories.length === 0) return;
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO persona_memory (ts, persona, note)
    VALUES (?, ?, ?)
  `);
  for (const m of memories) {
    if (m.persona && m.note) {
      stmt.run(now, m.persona, m.note.slice(0, 255));
    }
  }
}

export function recordDirectorRun(
  db: DatabaseSync,
  run: {
    ts: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    ok: boolean;
    error?: string | null;
  }
): void {
  try {
    const stmt = db.prepare(`
      INSERT INTO director_runs (ts, model, input_tokens, output_tokens, cost_usd, ok, error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      run.ts,
      run.model,
      run.inputTokens,
      run.outputTokens,
      run.costUsd,
      run.ok ? 1 : 0,
      run.error || null
    );
  } catch (err) {
    console.error('Peringatan: Gagal mencatat director_runs:', err);
  }
}

export function getDirectorStatsToday(db: DatabaseSync, now = new Date()): DirectorStats {
  const dateStr = now.toISOString().slice(0, 10);
  try {
    const countStmt = db.prepare(`
      SELECT COUNT(*) as cnt, COALESCE(SUM(cost_usd), 0) as total_cost
      FROM director_runs
      WHERE ts LIKE ?
    `);
    const countRow = countStmt.get(`${dateStr}%`) as { cnt: number; total_cost: number };

    const lastStmt = db.prepare(`
      SELECT ts, ok, error
      FROM director_runs
      ORDER BY id DESC
      LIMIT 1
    `);
    const lastRow = lastStmt.get() as { ts: string; ok: number; error: string | null } | undefined;

    return {
      callsToday: countRow?.cnt || 0,
      costUsdToday: countRow?.total_cost || 0,
      lastCallTs: lastRow?.ts || null,
      lastOk: lastRow ? lastRow.ok === 1 : true,
      lastError: lastRow?.error || null,
    };
  } catch {
    return {
      callsToday: 0,
      costUsdToday: 0,
      lastCallTs: null,
      lastOk: true,
      lastError: null,
    };
  }
}

export function readApiKey(keyPath: string | null): string | null {
  if (!keyPath) return null;
  try {
    if (!fs.existsSync(keyPath)) return null;
    const content = fs.readFileSync(keyPath, 'utf8').trim();
    return content.length > 0 ? content : null;
  } catch {
    return null;
  }
}

export function canCallDirector(
  db: DatabaseSync,
  config: DirectorConfig,
  allPersonasIdle: boolean,
  now = new Date()
): { allowed: boolean; reason?: string } {
  if (!config.enabled) {
    return { allowed: false, reason: 'Director dinonaktifkan (KANTOR_DIRECTOR_ENABLED!=true)' };
  }

  if (!allPersonasIdle) {
    return { allowed: false, reason: 'Ada persona yang masih berstatus working' };
  }

  const apiKey = readApiKey(config.apiKeyFile);
  if (!apiKey) {
    return { allowed: false, reason: 'Kunci API Director tidak ditemukan atau kosong' };
  }

  const stats = getDirectorStatsToday(db, now);

  if (stats.callsToday >= config.maxDailyCalls) {
    return { allowed: false, reason: `Melebihi batas harian panggilan (${config.maxDailyCalls})` };
  }

  if (stats.costUsdToday >= config.dailyBudgetUsd) {
    return { allowed: false, reason: `Melebihi anggaran harian ($${config.dailyBudgetUsd})` };
  }

  if (stats.lastCallTs) {
    const lastTime = new Date(stats.lastCallTs).getTime();
    const elapsedMinutes = (now.getTime() - lastTime) / (1000 * 60);
    if (elapsedMinutes < config.minIntervalMin) {
      return { allowed: false, reason: `Interval minimal belum tercapai (${Math.round(elapsedMinutes)}/${config.minIntervalMin} menit)` };
    }
  }

  return { allowed: true };
}

/**
 * Membangun prompt aman privasi.
 * PENTING: Dilarang menyertakan judul task, isi prompt, atau transcript.
 */
export function buildDirectorPrompt(
  personas: Persona[],
  todayTaskCounts: Record<string, number>,
  recentMemories: Array<{ persona: string; note: string }>,
  validSpots: string[]
): { system: string; user: string } {
  const personaDescriptions = personas
    .map(p => `- ${p.name} (${p.id}): ${p.role}. Menyelesaikan ${todayTaskCounts[p.id] || 0} tugas hari ini.`)
    .join('\n');

  const memoryBlock = recentMemories.length > 0
    ? recentMemories.map(m => `- [${m.persona}]: ${m.note}`).join('\n')
    : '(Belum ada memori sebelumnya)';

  const spotsList = validSpots.join(', ');

  const system = `Kamu adalah Director santai di Kantor Virtual Tim AI.
Tugasmu adalah menciptakan adegan santai pendek (basa-basi kopi, diskusi game, meditasi, komentar tatami) ketika semua karakter sedang idle.

Aturan Wajib:
1. Format keluaran HARUS berupa JSON murni dengan skema:
{
  "scenes": [
    {
      "actor": "id_persona",
      "action": "walk|sit|say|chat|coffee|watch_tv|look_window",
      "spot": "nama_spot_valid",
      "with": "id_persona_lawan_bicara (opsional)",
      "line": "ucapan maksimal 80 karakter (opsional)",
      "duration_s": 15
    }
  ],
  "memory_notes": [
    {
      "persona": "id_persona",
      "note": "catatan kebiasaan/lelucon internal pendek untuk diingat (maks 150 karakter)"
    }
  ]
}
2. Nama spot HANYA boleh salah satu dari daftar berikut:
${spotsList}
3. Panjang teks "line" TIDAK BOLEH lebih dari 80 karakter.
4. Jangan halusinasi task rahasia. Fokus pada obrolan santai, suasana kantor, kopi, teh tatami, game PS5, atau meditasi.`;

  const user = `Kondisi tim AI saat ini:
${personaDescriptions}

Memori terakhir obrolan kantor:
${memoryBlock}

Silakan buat 1-3 adegan santai yang natural dan 1-2 memori baru.`;

  return { system, user };
}

export function validateDirectorOutput(
  raw: unknown,
  validPersonaIds: Set<string>,
  validSpots: Set<string>
): { ok: true; data: DirectorOutput } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: 'Output bukan objek JSON valid' };
  }

  const obj = raw as Record<string, unknown>;

  if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
    return { ok: false, error: 'Field "scenes" harus berupa array dan tidak boleh kosong' };
  }

  const validatedScenes: SceneAction[] = [];
  for (let i = 0; i < obj.scenes.length; i++) {
    const s = obj.scenes[i];
    if (typeof s !== 'object' || s === null) {
      return { ok: false, error: `Scene indeks ${i} bukan objek` };
    }
    const sc = s as Record<string, unknown>;

    if (typeof sc.actor !== 'string' || !validPersonaIds.has(sc.actor)) {
      return { ok: false, error: `Scene ${i}: actor "${sc.actor}" tidak dikenal` };
    }

    if (typeof sc.action !== 'string' || !VALID_ACTIONS.has(sc.action)) {
      return { ok: false, error: `Scene ${i}: action "${sc.action}" tidak sah` };
    }

    if (sc.spot !== undefined && sc.spot !== null) {
      if (typeof sc.spot !== 'string' || !validSpots.has(sc.spot)) {
        return { ok: false, error: `Scene ${i}: spot "${sc.spot}" tidak terdaftar di office.json` };
      }
    }

    if (sc.with !== undefined && sc.with !== null) {
      if (typeof sc.with !== 'string' || !validPersonaIds.has(sc.with)) {
        return { ok: false, error: `Scene ${i}: with "${sc.with}" tidak dikenal` };
      }
    }

    if (sc.line !== undefined && sc.line !== null) {
      if (typeof sc.line !== 'string') {
        return { ok: false, error: `Scene ${i}: line harus berupa string` };
      }
      if (sc.line.length > 80) {
        return { ok: false, error: `Scene ${i}: line melebihi 80 karakter (panjang: ${sc.line.length})` };
      }
    }

    let duration_s = 15;
    if (sc.duration_s !== undefined && sc.duration_s !== null) {
      if (typeof sc.duration_s !== 'number' || sc.duration_s < 5 || sc.duration_s > 120) {
        return { ok: false, error: `Scene ${i}: duration_s harus antara 5 dan 120 detik` };
      }
      duration_s = sc.duration_s;
    }

    validatedScenes.push({
      actor: sc.actor,
      action: sc.action as SceneAction['action'],
      spot: sc.spot as string | undefined,
      with: sc.with as string | undefined,
      line: sc.line as string | undefined,
      duration_s,
    });
  }

  const validatedMemories: MemoryNote[] = [];
  if (Array.isArray(obj.memory_notes)) {
    for (let i = 0; i < obj.memory_notes.length; i++) {
      const m = obj.memory_notes[i];
      if (typeof m === 'object' && m !== null) {
        const mc = m as Record<string, unknown>;
        if (typeof mc.persona === 'string' && validPersonaIds.has(mc.persona) && typeof mc.note === 'string') {
          validatedMemories.push({
            persona: mc.persona,
            note: mc.note.slice(0, 200),
          });
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      scenes: validatedScenes,
      memory_notes: validatedMemories,
    },
  };
}

export async function runDirectorTick(
  db: DatabaseSync,
  config: DirectorConfig,
  personas: Persona[],
  validSpots: string[],
  todayTaskCounts: Record<string, number>,
  allPersonasIdle: boolean,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: boolean; fallback: boolean; output?: DirectorOutput; error?: string }> {
  const now = new Date();
  const check = canCallDirector(db, config, allPersonasIdle, now);
  if (!check.allowed) {
    return { ok: false, fallback: true, error: check.reason };
  }

  const apiKey = readApiKey(config.apiKeyFile);
  if (!apiKey) {
    return { ok: false, fallback: true, error: 'Kunci API kosong' };
  }

  const recentMemories = getRecentMemories(db, 10);
  const { system, user } = buildDirectorPrompt(personas, todayTaskCounts, recentMemories, validSpots);

  const endpoint = `${config.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const validPersonaIds = new Set(personas.map(p => p.id));
  const validSpotsSet = new Set(validSpots);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 600,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      recordDirectorRun(db, {
        ts: now.toISOString(),
        model: config.model,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        ok: false,
        error: `HTTP ${res.status}: ${errText.slice(0, 150)}`,
      });
      return { ok: false, fallback: true, error: `HTTP ${res.status}` };
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      recordDirectorRun(db, {
        ts: now.toISOString(),
        model: config.model,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        costUsd: 0,
        ok: false,
        error: 'Respons konten kosong',
      });
      return { ok: false, fallback: true, error: 'Respons konten kosong' };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      recordDirectorRun(db, {
        ts: now.toISOString(),
        model: config.model,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        costUsd: 0,
        ok: false,
        error: 'JSON tidak valid',
      });
      return { ok: false, fallback: true, error: 'JSON tidak valid' };
    }

    const valResult = validateDirectorOutput(parsed, validPersonaIds, validSpotsSet);
    if (!valResult.ok) {
      recordDirectorRun(db, {
        ts: now.toISOString(),
        model: config.model,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        costUsd: 0,
        ok: false,
        error: `Skema invalid: ${valResult.error}`,
      });
      return { ok: false, fallback: true, error: valResult.error };
    }

    // Hitung estimasi biaya sederhana (contoh DeepSeek: $0.14/M input, $0.28/M output)
    const inTokens = data.usage?.prompt_tokens || 0;
    const outTokens = data.usage?.completion_tokens || 0;
    const estimatedCost = (inTokens * 0.14 + outTokens * 0.28) / 1_000_000;

    recordDirectorRun(db, {
      ts: now.toISOString(),
      model: config.model,
      inputTokens: inTokens,
      outputTokens: outTokens,
      costUsd: estimatedCost,
      ok: true,
      error: null,
    });

    savePersonaMemories(db, valResult.data.memory_notes);

    return {
      ok: true,
      fallback: false,
      output: valResult.data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    recordDirectorRun(db, {
      ts: now.toISOString(),
      model: config.model,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      ok: false,
      error: msg.slice(0, 150),
    });
    return { ok: false, fallback: true, error: msg };
  } finally {
    clearTimeout(timeoutId);
  }
}
