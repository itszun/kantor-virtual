import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';
import { sweepStale, getSnapshot } from '../src/state.ts';

const PORT = 8805;

test('Pembersihan stale task (sweepStale)', async (t) => {
  const server = createServer({
    port: PORT,
    dbPath: ':memory:',
    staleMinClaude: 30,
    staleMinAgy: 60,
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  t.after(async () => {
    await server.closeAll();
  });

  const now = Date.now();
  const oldStartedAt = new Date(now - 61 * 60 * 1000).toISOString(); // 61 menit lalu (> 60m agy)
  const recentStartedAt = new Date(now - 10 * 60 * 1000).toISOString(); // 10 menit lalu

  // Masukkan task agy yang sudah berjalan 61 menit lalu untuk alex
  server.db.prepare(`
    INSERT INTO tasks (task_id, persona, title, level, source, started_at, ended_at, status)
    VALUES (?, ?, ?, ?, ?, ?, NULL, 'running')
  `).run('task-agy-stale', 'alex', 'Old Task', 'technical', 'agy', oldStartedAt);

  // Masukkan task claude yang baru 10 menit lalu untuk greg
  server.db.prepare(`
    INSERT INTO tasks (task_id, persona, title, level, source, started_at, ended_at, status)
    VALUES (?, ?, ?, ?, ?, ?, NULL, 'running')
  `).run('task-claude-recent', 'greg', 'Recent Task', null, 'claude-hook', recentStartedAt);

  // Sebelum sweep: alex working, greg working
  const snapBefore = getSnapshot(server.db, server.config.personas);
  const alexBefore = snapBefore.personas.find((p) => p.id === 'alex');
  const gregBefore = snapBefore.personas.find((p) => p.id === 'greg');
  assert.equal(alexBefore?.state, 'working');
  assert.equal(gregBefore?.state, 'working');

  // Jalankan sweepStale
  const sweptCount = sweepStale(server.db, server.config.staleMinClaude, server.config.staleMinAgy);
  assert.equal(sweptCount, 1);

  // Setelah sweep: alex harus idle di lounge, greg tetap working di desk_greg
  const snapAfter = getSnapshot(server.db, server.config.personas);
  const alexAfter = snapAfter.personas.find((p) => p.id === 'alex');
  const gregAfter = snapAfter.personas.find((p) => p.id === 'greg');

  assert.equal(alexAfter?.state, 'idle');
  assert.equal(alexAfter?.spot, 'lounge');
  assert.equal(alexAfter?.task, null);

  assert.equal(gregAfter?.state, 'working');
  assert.equal(gregAfter?.spot, 'desk_greg');
  assert.equal(gregAfter?.task?.id, 'task-claude-recent');

  // Periksa status task di DB
  const oldTaskRow = server.db.prepare(`SELECT status FROM tasks WHERE task_id = ?`).get('task-agy-stale') as { status: string };
  assert.equal(oldTaskRow.status, 'stale');
});
