import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createServer } from '../src/server.ts';

const PORT = 8802;
const tmpDir = path.join(os.tmpdir(), 'kantor-test-auth-' + crypto.randomUUID());
fs.mkdirSync(tmpDir, { recursive: true });
const tokenFile = path.join(tmpDir, 'token.txt');
const testToken = 'my-secret-ingest-token';
fs.writeFileSync(tokenFile, testToken);

test('Autentikasi POST /api/events', async (t) => {
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

  await t.test('tanpa token mengembalikan 401', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: 'alex', type: 'prompt' }),
    });
    assert.equal(res.status, 401);
  });

  await t.test('token salah mengembalikan 401', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wrong-token',
      },
      body: JSON.stringify({ persona: 'alex', type: 'prompt' }),
    });
    assert.equal(res.status, 401);
  });

  await t.test('token file tak ada mengembalikan 503', async () => {
    const nonExistentTokenFile = path.join(tmpDir, 'does-not-exist.txt');
    const noTokenServer = createServer({
      port: 8822,
      dbPath: ':memory:',
      ingestTokenFile: nonExistentTokenFile,
    });
    await new Promise<void>((resolve) => noTokenServer.listen(8822, resolve));

    try {
      const res = await fetch(`http://127.0.0.1:8822/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testToken}`,
        },
        body: JSON.stringify({ persona: 'alex', type: 'prompt' }),
      });
      assert.equal(res.status, 503);
    } finally {
      await noTokenServer.closeAll();
    }
  });

  await t.test('token benar mengembalikan 202', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testToken}`,
      },
      body: JSON.stringify({ persona: 'alex', type: 'prompt' }),
    });
    assert.equal(res.status, 202);
  });
});
