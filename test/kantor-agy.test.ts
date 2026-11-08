import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { createServer } from '../src/server.ts';
import { PROJECT_ROOT } from '../src/config.ts';

const PORT = 8831;
const WRAPPER_SCRIPT = path.join(PROJECT_ROOT, 'tools', 'kantor-agy.sh');
const FAKE_AGY = path.join(PROJECT_ROOT, 'test', 'fixtures', 'fake-agy.sh');

function runWrapper(
  args: string[],
  env: Record<string, string>
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(WRAPPER_SCRIPT, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d.toString('utf8');
    });
    child.stderr.on('data', (d) => {
      stderr += d.toString('utf8');
    });
    child.on('close', (status) => {
      resolve({ status, stdout, stderr });
    });
    child.stdin.end();
  });
}

test('kantor-agy.sh: wrapper agy untuk alex dan windry', async (t) => {
  const tmpDir = path.join(os.tmpdir(), 'kantor-test-agy-' + crypto.randomUUID());
  fs.mkdirSync(tmpDir, { recursive: true });
  const tokenFile = path.join(tmpDir, 'token.txt');
  const token = 'secret-agy-token';
  fs.writeFileSync(tokenFile, token);

  const server = createServer({
    port: PORT,
    dbPath: ':memory:',
    ingestTokenFile: tokenFile,
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  t.after(async () => {
    await server.closeAll();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // 1. Sukses: alex dengan prompt -p
  const logArgsFile1 = path.join(tmpDir, 'args-1.txt');
  const res1 = await runWrapper(
    ['--persona', 'alex', '--', '-p', 'Bikin endpoint baru', '--model', 'gemini-pro'],
    {
      KANTOR_URL: `http://127.0.0.1:${PORT}`,
      KANTOR_INGEST_TOKEN_FILE: tokenFile,
      KANTOR_AGY_BIN: FAKE_AGY,
      FIXTURE_LOG_ARGS: logArgsFile1,
    }
  );

  assert.equal(res1.status, 0);
  assert.match(res1.stdout, /Halo dari fake agy!/);

  // Periksa bahwa --output-format json ditambahkan otomatis
  const loggedArgs = fs.readFileSync(logArgsFile1, 'utf8');
  assert.match(loggedArgs, /--output-format json/);

  // Periksa task.start dan task.end di database
  const alexTask = server.db
    .prepare("SELECT * FROM tasks WHERE persona = 'alex' ORDER BY started_at DESC LIMIT 1")
    .get() as { task_id: string; title: string; level: string; status: string } | undefined;

  assert.ok(alexTask);
  assert.equal(alexTask.title, 'Bikin endpoint baru');
  assert.equal(alexTask.level, 'technical');
  assert.equal(alexTask.status, 'done');

  // Periksa usage tercatat
  const alexUsage = server.db
    .prepare("SELECT * FROM usage WHERE persona = 'alex' AND source = 'agy' ORDER BY id DESC LIMIT 1")
    .get() as { input: number; output: number; cache_read: number; thinking: number; model: string } | undefined;

  assert.ok(alexUsage);
  assert.equal(alexUsage.input, 150);
  assert.equal(alexUsage.output, 75);
  assert.equal(alexUsage.cache_read, 10);
  assert.equal(alexUsage.thinking, 25);
  assert.equal(alexUsage.model, 'gemini-pro');

  // 2. Gagal: windry dengan argumen --fail
  const res2 = await runWrapper(
    ['--persona', 'windry', '--title', 'Tugas darurat', '--', '--fail'],
    {
      KANTOR_URL: `http://127.0.0.1:${PORT}`,
      KANTOR_INGEST_TOKEN_FILE: tokenFile,
      KANTOR_AGY_BIN: FAKE_AGY,
    }
  );

  assert.equal(res2.status, 1);

  // Periksa task.fail di database
  const windryTask = server.db
    .prepare("SELECT * FROM tasks WHERE persona = 'windry' ORDER BY started_at DESC LIMIT 1")
    .get() as { title: string; level: string; status: string } | undefined;

  assert.ok(windryTask);
  assert.equal(windryTask.title, 'Tugas darurat');
  assert.equal(windryTask.level, 'tactical');
  assert.equal(windryTask.status, 'failed');

  // 3. Persona tidak valid (bukan alex atau windry) -> exit 2
  const res3 = await runWrapper(['--persona', 'greg', '--', '-p', 'Halo'], {
    KANTOR_URL: `http://127.0.0.1:${PORT}`,
    KANTOR_INGEST_TOKEN_FILE: tokenFile,
    KANTOR_AGY_BIN: FAKE_AGY,
  });

  assert.equal(res3.status, 2);
  assert.match(res3.stderr, /Error: persona harus alex atau windry/);
});
