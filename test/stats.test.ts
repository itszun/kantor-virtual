import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createServer } from '../src/server.ts';

const PORT = 8804;
const tmpDir = path.join(os.tmpdir(), 'kantor-test-stats-' + crypto.randomUUID());
fs.mkdirSync(tmpDir, { recursive: true });
const tokenFile = path.join(tmpDir, 'token.txt');
const testToken = 'stats-token';
fs.writeFileSync(tokenFile, testToken);

test('Statistik agregasi hari ini dan deduplikasi usage', async (t) => {
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

  // Kirim dua task.start hari ini
  await fetch(`http://127.0.0.1:${PORT}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testToken}`,
    },
    body: JSON.stringify({
      persona: 'alex',
      type: 'task.start',
      task_id: 'task-stats-1',
      title: 'Task 1',
    }),
  });

  await fetch(`http://127.0.0.1:${PORT}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testToken}`,
    },
    body: JSON.stringify({
      persona: 'betty',
      type: 'task.start',
      task_id: 'task-stats-2',
      title: 'Task 2',
    }),
  });

  // Cek delegations_today bernilai 2
  const stateRes1 = await fetch(`http://127.0.0.1:${PORT}/api/state`);
  const state1 = await stateRes1.json();
  assert.equal(state1.stats.delegations_today, 2);
  assert.equal(state1.stats.active_now, 2);

  // Kirim usage dengan message_id yang sama dua kali
  const msgId = 'msg-unique-42';
  const usageEvent = {
    persona: 'greg',
    type: 'usage',
    message_id: msgId,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_tokens: 10,
      cache_write_tokens: 5,
      thinking_tokens: 20,
    },
    cost_usd: 0.0025,
  };

  // Kirim pertama
  const u1 = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testToken}`,
    },
    body: JSON.stringify(usageEvent),
  });
  assert.equal(u1.status, 202);

  // Kirim kedua (duplikat message_id)
  const u2 = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testToken}`,
    },
    body: JSON.stringify(usageEvent),
  });
  assert.equal(u2.status, 202);

  // Periksa snapshot stats: harus dihitung satu kali saja (165 token, thinking tidak dijumlahkan, cost 0.0025)
  // 100 + 50 + 10 + 5 = 165
  const stateRes2 = await fetch(`http://127.0.0.1:${PORT}/api/state`);
  const state2 = await stateRes2.json();
  assert.equal(state2.stats.tokens_today, 165);
  assert.equal(state2.stats.cost_today_usd, 0.0025);

  // Periksa langsung ke DB usage row count
  const usageCountRow = server.db.prepare(`SELECT count(*) as c FROM usage`).get() as { c: number };
  assert.equal(usageCountRow.c, 1);
});
