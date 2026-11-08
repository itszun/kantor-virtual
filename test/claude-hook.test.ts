import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { createServer } from '../src/server.ts';
import { PROJECT_ROOT } from '../src/config.ts';

const PORT = 8830;
const SCRIPT_PATH = path.join(PROJECT_ROOT, 'tools', 'claude-hook.sh');

function runHook(
  input: string,
  env: Record<string, string>
): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(SCRIPT_PATH, [], {
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
    child.stdin.write(input);
    child.stdin.end();
  });
}

test('claude-hook.sh: perilaku hook Claude Code', async (t) => {
  const tmpDir = path.join(os.tmpdir(), 'kantor-test-hook-' + crypto.randomUUID());
  fs.mkdirSync(tmpDir, { recursive: true });
  const tokenFile = path.join(tmpDir, 'token.txt');
  const token = 'secret-hook-token';
  fs.writeFileSync(tokenFile, token);

  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // 1. Server mati → exit 0 tanpa output
  const resServerDead = await runHook(
    JSON.stringify({ hook_event_name: 'Stop', session_id: 'dead-sess' }),
    {
      KANTOR_URL: `http://127.0.0.1:${PORT}`,
      KANTOR_INGEST_TOKEN_FILE: tokenFile,
    }
  );
  assert.equal(resServerDead.status, 0);
  assert.equal(resServerDead.stdout, '');
  assert.equal(resServerDead.stderr, '');

  // 2. JSON rusak → exit 0 tanpa output
  const resBrokenJson = await runHook('{ broken json ...', {
    KANTOR_URL: `http://127.0.0.1:${PORT}`,
    KANTOR_INGEST_TOKEN_FILE: tokenFile,
  });
  assert.equal(resBrokenJson.status, 0);
  assert.equal(resBrokenJson.stdout, '');
  assert.equal(resBrokenJson.stderr, '');

  // 3. Server hidup → event diterima
  const server = createServer({
    port: PORT,
    dbPath: ':memory:',
    ingestTokenFile: tokenFile,
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  t.after(async () => {
    await server.closeAll();
  });

  const resServerAlive = await runHook(
    JSON.stringify({
      hook_event_name: 'UserPromptSubmit',
      session_id: 'live-sess',
      prompt: 'Halo dari hook test',
    }),
    {
      KANTOR_URL: `http://127.0.0.1:${PORT}`,
      KANTOR_INGEST_TOKEN_FILE: tokenFile,
    }
  );
  assert.equal(resServerAlive.status, 0);
  assert.equal(resServerAlive.stdout, '');
  assert.equal(resServerAlive.stderr, '');

  // Periksa bahwa task.start tercatat di database server
  const taskRow = server.db
    .prepare('SELECT task_id, persona, title, status FROM tasks WHERE task_id = ?')
    .get('claude-live-sess') as { task_id: string; persona: string; title: string; status: string } | undefined;

  assert.ok(taskRow);
  assert.equal(taskRow.persona, 'greg');
  assert.equal(taskRow.title, 'Halo dari hook test');
  assert.equal(taskRow.status, 'running');
});
