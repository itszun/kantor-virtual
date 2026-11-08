import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createServer } from '../src/server.ts';

const PORT = 8801;
const tmpDir = path.join(os.tmpdir(), 'kantor-test-val-' + crypto.randomUUID());
fs.mkdirSync(tmpDir, { recursive: true });
const tokenFile = path.join(tmpDir, 'token.txt');
const testToken = 'valid-token-123';
fs.writeFileSync(tokenFile, testToken);
const dbPath = path.join(tmpDir, 'test.db');

test('Validasi endpoint POST /api/events', async (t) => {
  const server = createServer({
    port: PORT,
    dbPath,
    ingestTokenFile: tokenFile,
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  t.after(async () => {
    await server.closeAll();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await t.test('persona tak dikenal mengembalikan 400', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        persona: 'unknown_agent',
        type: 'prompt',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /persona/i);
  });

  await t.test('type tak dikenal mengembalikan 400', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        persona: 'alex',
        type: 'invalid.action',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /type/i);
  });

  await t.test('field tak dikenal di root mengembalikan 400', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        persona: 'alex',
        type: 'task.start',
        extra_unknown_field: 'illegal',
      }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /tak dikenal/i);
  });

  await t.test('title dipotong 120 karakter', async () => {
    const longTitle = 'A'.repeat(200);
    const taskId = 'val-task-120';
    const res = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({
        persona: 'alex',
        type: 'task.start',
        task_id: taskId,
        title: longTitle,
      }),
    });
    assert.equal(res.status, 202);

    const taskRow = server.db
      .prepare(`SELECT title FROM tasks WHERE task_id = ?`)
      .get(taskId) as { title: string };
    assert.equal(taskRow.title.length, 120);
    assert.equal(taskRow.title, 'A'.repeat(120));
  });

  await t.test('body > 16 KB mengembalikan 413', async () => {
    const largePayload = {
      persona: 'alex',
      type: 'prompt',
      title: 'B'.repeat(20 * 1024), // 20 KB
    };

    const res = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify(largePayload),
    });
    assert.equal(res.status, 413);
  });

  await t.test('JSON rusak mengembalikan 400', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: '{"persona": "alex", "type": ',
    });
    assert.equal(res.status, 400);
  });
});
