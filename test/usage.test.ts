import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.ts';

const PORT = 8832;

test('GET /api/usage: laporan agregasi token & biaya per hari, persona, dan model', async (t) => {
  const server = createServer({
    port: PORT,
    dbPath: ':memory:',
  });

  await new Promise<void>((resolve) => server.listen(PORT, resolve));

  t.after(async () => {
    await server.closeAll();
  });

  // Siapkan waktu acuan hari ini dan kemarin dalam zona Asia/Jakarta
  const now = new Date();
  const jktFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = jktFormatter.format(now);
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = jktFormatter.format(yesterdayDate);

  const todayIso = new Date(`${todayStr}T10:00:00+07:00`).toISOString();
  const yesterdayIso = new Date(`${yesterdayStr}T10:00:00+07:00`).toISOString();

  // Masukkan data usage contoh
  const insertStmt = server.db.prepare(`
    INSERT INTO usage (ts, persona, source, model, message_id, input, output, cache_read, cache_write, thinking, cost_usd)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Baris 1: Greg hari ini, model claude-opus, ada biaya
  insertStmt.run(todayIso, 'greg', 'claude-transcript', 'claude-opus', 'msg-u-1', 100, 50, 10, 5, 20, 0.015);
  // Baris 2: Alex hari ini, model gemini-pro, tanpa biaya (null)
  insertStmt.run(todayIso, 'alex', 'agy', 'gemini-pro', 'msg-u-2', 200, 100, 0, 0, 50, null);
  // Baris 3: Betty kemarin, model claude-opus, ada biaya
  insertStmt.run(yesterdayIso, 'betty', 'claude-transcript', 'claude-opus', 'msg-u-3', 300, 150, 20, 10, 0, 0.045);

  // Panggil endpoint GET /api/usage?days=7
  const res = await fetch(`http://127.0.0.1:${PORT}/api/usage?days=7`);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(Array.isArray(data.days));
  assert.equal(data.days.length, 7);

  // Hari terakhir pada array days haruslah todayStr
  const todayEntry = data.days.find((d: { date: string }) => d.date === todayStr);
  assert.ok(todayEntry);
  // greg hari ini: 100 + 50 + 10 + 5 = 165
  assert.equal(todayEntry.by_persona.greg.tokens, 165);
  assert.equal(todayEntry.by_persona.greg.cost_usd, 0.015);
  // alex hari ini: 200 + 100 + 0 + 0 = 300, cost null
  assert.equal(todayEntry.by_persona.alex.tokens, 300);
  assert.equal(todayEntry.by_persona.alex.cost_usd, null);

  // Hari kemarin pada array days
  const yesterdayEntry = data.days.find((d: { date: string }) => d.date === yesterdayStr);
  assert.ok(yesterdayEntry);
  // betty kemarin: 300 + 150 + 20 + 10 = 480
  assert.equal(yesterdayEntry.by_persona.betty.tokens, 480);
  assert.equal(yesterdayEntry.by_persona.betty.cost_usd, 0.045);

  // Periksa by_model
  const opusModel = data.by_model.find((m: { model: string }) => m.model === 'claude-opus');
  assert.ok(opusModel);
  // 165 + 480 = 645
  assert.equal(opusModel.tokens, 645);
  assert.equal(opusModel.cost_usd, 0.06);

  const geminiModel = data.by_model.find((m: { model: string }) => m.model === 'gemini-pro');
  assert.ok(geminiModel);
  assert.equal(geminiModel.tokens, 300);
  assert.equal(geminiModel.cost_usd, null);

  // Periksa totals
  // Total tokens: 165 + 300 + 480 = 945
  assert.equal(data.totals.tokens, 945);
  // Total cost: 0.015 + 0.045 = 0.06
  assert.equal(data.totals.cost_usd, 0.06);

  // Uji pembatasan parameter days maks 31
  const res31 = await fetch(`http://127.0.0.1:${PORT}/api/usage?days=999`);
  const data31 = await res31.json();
  assert.equal(data31.days.length, 31);
});
