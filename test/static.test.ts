import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';

const PORT = 8807;

test('File statis dan pencegahan path traversal', async (t) => {
  const server = createServer({
    port: PORT,
    dbPath: ':memory:',
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  t.after(async () => {
    await server.closeAll();
  });

  await t.test('GET / menyajikan public/index.html', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/html/);
    const text = await res.text();
    assert.match(text, /Kantor Weiwu/);
  });

  await t.test('/../package.json tidak bocor (mengembalikan 404/400)', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/../package.json`);
    assert.ok(res.status === 404 || res.status === 400);
    const text = await res.text();
    assert.doesNotMatch(text, /"name":\s*"kantor"/);
  });

  await t.test('file tak ada mengembalikan 404', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/not-found-random-123.css`);
    assert.equal(res.status, 404);
  });

  await t.test('GET /api/health mengembalikan { ok: true }', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { ok: true });
  });
});
