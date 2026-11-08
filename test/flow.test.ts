import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createServer } from '../src/server.ts';

const PORT = 8803;
const tmpDir = path.join(os.tmpdir(), 'kantor-test-flow-' + crypto.randomUUID());
fs.mkdirSync(tmpDir, { recursive: true });
const tokenFile = path.join(tmpDir, 'token.txt');
const testToken = 'flow-token';
fs.writeFileSync(tokenFile, testToken);

test('Alur task persona (start -> working di desk -> end -> idle di lounge)', async (t) => {
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

  // Kondisi awal: semua persona idle di lounge
  const initStateRes = await fetch(`http://127.0.0.1:${PORT}/api/state`);
  const initState = await initStateRes.json();
  const initAlex = initState.personas.find((p: { id: string }) => p.id === 'alex');
  assert.equal(initAlex.state, 'idle');
  assert.equal(initAlex.spot, 'lounge');
  assert.equal(initAlex.task, null);

  // Kirim task.start alex
  const startRes = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testToken}`,
    },
    body: JSON.stringify({
      persona: 'alex',
      type: 'task.start',
      task_id: 'task-flow-1',
      title: 'Perbaikan API',
      level: 'technical',
    }),
  });
  assert.equal(startRes.status, 202);

  // Cek snapshot: alex working di desk_alex
  const workingStateRes = await fetch(`http://127.0.0.1:${PORT}/api/state`);
  const workingState = await workingStateRes.json();
  const workingAlex = workingState.personas.find((p: { id: string }) => p.id === 'alex');
  assert.equal(workingAlex.state, 'working');
  assert.equal(workingAlex.spot, 'desk_alex');
  assert.equal(workingAlex.task.id, 'task-flow-1');
  assert.equal(workingAlex.task.title, 'Perbaikan API');
  assert.equal(workingAlex.task.level, 'technical');
  assert.equal(workingState.stats.active_now, 1);

  // Kirim task.end
  const endRes = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testToken}`,
    },
    body: JSON.stringify({
      persona: 'alex',
      type: 'task.end',
      task_id: 'task-flow-1',
    }),
  });
  assert.equal(endRes.status, 202);

  // Cek snapshot lagi: alex kembali idle di lounge
  const endStateRes = await fetch(`http://127.0.0.1:${PORT}/api/state`);
  const endState = await endStateRes.json();
  const endAlex = endState.personas.find((p: { id: string }) => p.id === 'alex');
  assert.equal(endAlex.state, 'idle');
  assert.equal(endAlex.spot, 'lounge');
  assert.equal(endAlex.task, null);
  assert.equal(endState.stats.active_now, 0);

  // Cek riwayat task lewat /api/history
  const histRes = await fetch(`http://127.0.0.1:${PORT}/api/history?limit=10`);
  assert.equal(histRes.status, 200);
  const history = await histRes.json();
  assert.equal(history.length, 1);
  assert.equal(history[0].task_id, 'task-flow-1');
  assert.equal(history[0].status, 'done');
});
