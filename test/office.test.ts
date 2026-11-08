import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';

const PORT = 8840;

test('Endpoint /api/office dan vendor /vendor/three/*', async (t) => {
  const server = createServer({
    port: PORT,
    dbPath: ':memory:',
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  t.after(async () => {
    await server.closeAll();
  });

  await t.test('GET /api/office 200 berisi 4 persona & semua spot desk_<id>', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/office`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /application\/json/);

    const data = await res.json() as {
      office: { spots: Record<string, unknown> };
      idle_lines: Record<string, unknown>;
      personas: Array<{ id: string; desk_spot: string }>;
    };

    assert.ok(data.office);
    assert.ok(data.idle_lines);
    assert.ok(Array.isArray(data.personas));
    assert.equal(data.personas.length, 4);

    const personaIds = data.personas.map((p) => p.id);
    assert.deepEqual(personaIds.sort(), ['alex', 'betty', 'greg', 'windry']);

    for (const p of data.personas) {
      assert.equal(p.desk_spot, `desk_${p.id}`);
      assert.ok(data.office.spots[p.desk_spot], `Spot ${p.desk_spot} harus ada di office.spots`);
    }
  });

  await t.test('GET /vendor/three/build/three.module.js 200 dengan content-type javascript', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/vendor/three/build/three.module.js`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /javascript/);
    const text = await res.text();
    assert.ok(text.length > 1000);
  });

  await t.test('GET /vendor/three/../package.json mengembalikan 404', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/vendor/three/../package.json`);
    assert.ok(res.status === 404 || res.status === 400);
  });

  await t.test('GET /vendor/three/src/Three.js mengembalikan 404 (hanya build/ dan examples/jsm/ yang diizinkan)', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/vendor/three/src/Three.js`);
    assert.equal(res.status, 404);
  });

  await t.test('GET /vendor/three/package.json mengembalikan 404', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/vendor/three/package.json`);
    assert.equal(res.status, 404);
  });
});
