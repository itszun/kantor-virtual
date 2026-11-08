import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer } from '../src/server.ts';
import { classifyIntent, runHermesDispatcher } from '../tools/kantor-hermes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT = 8842;

test('classifyIntent: klasifikasi tugas ke spesialis yang tepat', () => {
  // Strategic / Planning -> greg
  assert.equal(classifyIntent('Rancang arsitektur sistem microservices').target, 'greg');
  assert.equal(classifyIntent('Evaluasi roadmap dan PRD v0.3').target, 'greg');

  // Creative / Visual -> agy (alex) (Agy Artist)
  assert.equal(classifyIntent('Buat gambar lukisan cat minyak untuk atelier').target, 'alex');
  assert.equal(classifyIntent('Render aset visual 3D untuk kantor').target, 'alex');
  assert.equal(classifyIntent('Bikin shader efek asap Three.js').target, 'alex');

  // Review / Second Opinion / Text -> codex
  assert.equal(classifyIntent('Berikan second opinion draf arsitektur').target, 'codex');
  assert.equal(classifyIntent('Tinjauan kritis dan telaah teks dokumen PRD').target, 'codex');
  assert.equal(classifyIntent('Tuliskan puisi pendek 4 baris tentang zen').target, 'codex');

  // Technical / Code -> alex
  assert.equal(classifyIntent('Refactor fungsi pathfinding di nav.ts').target, 'alex');
  assert.equal(classifyIntent('Perbaiki bug token auth di events.ts').target, 'alex');
});

test('tools/kantor-hermes: dispatch orkestrasi dan telemetri event kantor-api', async (t) => {
  const tmpDir = path.join(os.tmpdir(), 'kantor-test-hermes-' + crypto.randomUUID());
  fs.mkdirSync(tmpDir, { recursive: true });
  const tokenFile = path.join(tmpDir, 'token.txt');
  const token = 'secret-hermes-token';
  fs.writeFileSync(tokenFile, token);

  const server = createServer({
    port: PORT,
    dbPath: ':memory:',
    ingestTokenFile: tokenFile,
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  t.after(async () => {
    await server.closeAll();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Abaikan cleanup tmp
    }
  });

  const originalEnvUrl = process.env.KANTOR_URL;
  const originalEnvToken = process.env.KANTOR_INGEST_TOKEN_FILE;
  process.env.KANTOR_URL = `http://127.0.0.1:${PORT}`;
  process.env.KANTOR_INGEST_TOKEN_FILE = tokenFile;

  t.after(() => {
    if (originalEnvUrl) process.env.KANTOR_URL = originalEnvUrl;
    else delete process.env.KANTOR_URL;
    if (originalEnvToken) process.env.KANTOR_INGEST_TOKEN_FILE = originalEnvToken;
    else delete process.env.KANTOR_INGEST_TOKEN_FILE;
  });

  await t.test('dry-run dispatch mengirim event task.start dan task.end persona hermes', async () => {
    const exitCode = await runHermesDispatcher([
      '--task',
      'Rancang arsitektur sistem federated queue',
      '--dry-run',
    ]);
    assert.equal(exitCode, 0);

    const historyRes = await fetch(`http://127.0.0.1:${PORT}/api/history?limit=10`);
    assert.equal(historyRes.status, 200);
    const history = await historyRes.json() as Array<{
      persona: string;
      status: string;
      title: string;
      started_at: string;
      ended_at: string;
    }>;

    const hermesTask = history.find((h) => h.persona === 'hermes');
    assert.ok(hermesTask, 'Harus ada task dari persona hermes di tabel tasks');
    assert.equal(hermesTask.status, 'done');
    assert.match(hermesTask.title, /\[Dispatch -> greg\]/);
    assert.ok(hermesTask.started_at);
    assert.ok(hermesTask.ended_at);
  });
});
