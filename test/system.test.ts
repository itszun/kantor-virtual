import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';

const PORT = 8840;

test('GET /api/system: telemetri RAM server asli dan kalkulator boks gudang', async (t) => {
  const server = createServer({
    port: PORT,
    dbPath: ':memory:',
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  t.after(async () => {
    await server.closeAll();
  });

  const res = await fetch(`http://127.0.0.1:${PORT}/api/system`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/json/);

  const data = (await res.json()) as {
    total_mb: number;
    free_mb: number;
    used_mb: number;
    used_percent: number;
    storage_boxes_count: number;
  };

  assert.ok(data.total_mb > 0);
  assert.ok(data.free_mb >= 0);
  assert.ok(data.used_mb >= 0);
  assert.ok(data.used_percent >= 0 && data.used_percent <= 100);
  assert.ok(data.storage_boxes_count >= 1 && data.storage_boxes_count <= 20);
});
