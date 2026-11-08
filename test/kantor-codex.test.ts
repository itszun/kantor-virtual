import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { createServer } from '../src/server.ts';
import { PROJECT_ROOT, loadPersonas } from '../src/config.ts';

const PORT = 8839;
const WRAPPER_SCRIPT = path.join(PROJECT_ROOT, 'tools', 'kantor-codex.sh');
const FAKE_CODEX = path.join(PROJECT_ROOT, 'test', 'fixtures', 'fake-codex.sh');

function runCodexWrapper(
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

test('kantor-codex.sh: wrapper eksekusi Codex dengan telemetri event kantor-api', async (t) => {
  const tmpDir = path.join(os.tmpdir(), 'kantor-test-codex-' + crypto.randomUUID());
  fs.mkdirSync(tmpDir, { recursive: true });
  const tokenFile = path.join(tmpDir, 'token.txt');
  const token = 'secret-codex-token';
  fs.writeFileSync(tokenFile, token);

  const personas = loadPersonas(path.join(PROJECT_ROOT, 'config', 'personas.json'));

  const server = createServer({
    port: PORT,
    dbPath: ':memory:',
    ingestTokenFile: tokenFile,
    personas,
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  t.after(async () => {
    await server.closeAll();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Abaikan
    }
  });

  await t.test('sukses: mengirim task.start lalu task.end ke server dengan persona codex', async () => {
    const res = await runCodexWrapper(
      ['--title', 'Telaah dan second opinion draf arsitektur', '--', 'arg1', 'arg2'],
      {
        KANTOR_URL: `http://127.0.0.1:${PORT}`,
        KANTOR_INGEST_TOKEN_FILE: tokenFile,
        FAKE_CODEX_BIN: FAKE_CODEX,
      }
    );

    assert.equal(res.status, 0);
    assert.match(res.stdout, /Hasil review teks dari fake codex berhasil dibuat/);

    // Cek riwayat event di database kantor-api
    const rows = server.db
      .prepare('SELECT persona, type, title FROM events WHERE persona = ? ORDER BY id ASC')
      .all('codex') as Array<{ persona: string; type: string; title: string }>;

    assert.equal(rows.length, 2);
    assert.equal(rows[0].persona, 'codex');
    assert.equal(rows[0].type, 'task.start');
    assert.equal(rows[0].title, 'Telaah dan second opinion draf arsitektur');

    assert.equal(rows[1].persona, 'codex');
    assert.equal(rows[1].type, 'task.end');
  });

  await t.test('gagal: mengirim task.fail saat subproses codex keluar dengan kode error', async () => {
    const res = await runCodexWrapper(
      ['--title', 'Review second opinion gagal', '--', '--fail'],
      {
        KANTOR_URL: `http://127.0.0.1:${PORT}`,
        KANTOR_INGEST_TOKEN_FILE: tokenFile,
        FAKE_CODEX_BIN: FAKE_CODEX,
      }
    );

    assert.equal(res.status, 1);

    const rows = server.db
      .prepare('SELECT persona, type, title FROM events WHERE persona = ? AND title = ? ORDER BY id ASC')
      .all('codex', 'Review second opinion gagal') as Array<{ persona: string; type: string; title: string }>;

    assert.equal(rows.length, 2);
    assert.equal(rows[0].type, 'task.start');
    assert.equal(rows[1].type, 'task.fail');
  });
});
