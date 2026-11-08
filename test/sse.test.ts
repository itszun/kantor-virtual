import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createServer } from '../src/server.ts';

const PORT = 8806;
const tmpDir = path.join(os.tmpdir(), 'kantor-test-sse-' + crypto.randomUUID());
fs.mkdirSync(tmpDir, { recursive: true });
const tokenFile = path.join(tmpDir, 'token.txt');
const testToken = 'sse-token';
fs.writeFileSync(tokenFile, testToken);

test('SSE stream menerima snapshot saat connect dan setelah POST event', async (t) => {
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

  const receivedSnapshots: any[] = [];
  let sseReq: http.ClientRequest;

  // Sambungkan ke SSE stream
  await new Promise<void>((resolve, reject) => {
    sseReq = http.get(`http://127.0.0.1:${PORT}/api/stream`, (res) => {
      assert.equal(res.statusCode, 200);
      assert.match(res.headers['content-type'] || '', /text\/event-stream/);

      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // sisakan fragment

        for (const part of parts) {
          if (part.startsWith('event: snapshot')) {
            const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
            if (dataLine) {
              const jsonStr = dataLine.slice(6);
              try {
                receivedSnapshots.push(JSON.parse(jsonStr));
                if (receivedSnapshots.length === 1) {
                  resolve();
                }
              } catch (e) {
                reject(e);
              }
            }
          }
        }
      });
    });

    sseReq.on('error', reject);
  });

  // Snapshot pertama diterima saat connect
  assert.equal(receivedSnapshots.length, 1);
  assert.equal(receivedSnapshots[0].stats.active_now, 0);

  // Kirim event POST /api/events untuk mengubah state
  const postRes = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${testToken}`,
    },
    body: JSON.stringify({
      persona: 'windry',
      type: 'task.start',
      task_id: 'task-sse-1',
      title: 'Tugas Taktis SSE',
      level: 'tactical',
    }),
  });
  assert.equal(postRes.status, 202);

  // Tunggu snapshot kedua lewat stream
  const maxWait = 2000;
  const startWait = Date.now();
  while (receivedSnapshots.length < 2 && Date.now() - startWait < maxWait) {
    await new Promise((r) => setTimeout(r, 50));
  }

  assert.equal(receivedSnapshots.length, 2);
  const windrySnap = receivedSnapshots[1].personas.find((p: any) => p.id === 'windry');
  assert.equal(windrySnap.state, 'working');
  assert.equal(windrySnap.spot, 'desk_windry');
  assert.equal(receivedSnapshots[1].stats.active_now, 1);

  sseReq!.destroy();
});
