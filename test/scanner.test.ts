import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { initDatabase } from '../src/db.ts';
import { scanOnce } from '../src/scanner.ts';
import type { PricingConfig } from '../src/pricing.ts';

test('scanner: pemindaian transcript Claude secara inkremental dan akurat', () => {
  const tmpDir = path.join(os.tmpdir(), 'kantor-test-scanner-' + crypto.randomUUID());
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    const db = initDatabase(':memory:');
    const now = new Date('2026-11-08T12:00:00Z');

    const pricing: PricingConfig = {
      currency: 'USD',
      unit: 'per_million_tokens',
      models: {
        'claude-3-opus': {
          input: 15,
          output: 75,
          cache_read: 1.5,
          cache_write_5m: 18.75,
          cache_write_1h: 18.75,
        },
      },
    };

    const projDir = path.join(tmpDir, 'project-a');
    fs.mkdirSync(projDir, { recursive: true });
    const mainJsonl = path.join(projDir, 'session-1.jsonl');

    // 1. Baris normal dengan harga
    const lineNormal = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-11-08T10:00:00Z',
      sessionId: 'sess-1',
      message: {
        id: 'msg-norm-1',
        model: 'claude-3-opus',
        usage: {
          input_tokens: 1000,
          output_tokens: 2000,
          cache_read_input_tokens: 100,
          cache_creation_input_tokens: 200,
          cache_creation: {
            ephemeral_5m_input_tokens: 200,
          },
          output_tokens_details: {
            thinking_tokens: 50,
          },
        },
      },
    }) + '\n';

    // 2. Baris duplikat message.id identik
    const lineDuplicate = lineNormal;

    // 3. Baris lebih tua dari 7 hari
    const lineOld = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-10-20T10:00:00Z',
      sessionId: 'sess-1',
      message: {
        id: 'msg-old-1',
        model: 'claude-3-opus',
        usage: { input_tokens: 500, output_tokens: 500 },
      },
    }) + '\n';

    // 4. Model tanpa harga di pricing table
    const lineNoPrice = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-11-08T11:00:00Z',
      sessionId: 'sess-1',
      message: {
        id: 'msg-noprice-1',
        model: 'unpriced-experimental-model',
        usage: { input_tokens: 100, output_tokens: 200 },
      },
    }) + '\n';

    // Tulis file pertama
    fs.writeFileSync(mainJsonl, lineNormal + lineDuplicate + lineOld + lineNoPrice);

    // Subagent dengan meta betty
    const subagentsDir = path.join(projDir, 'subagents');
    fs.mkdirSync(subagentsDir, { recursive: true });
    const subJsonl = path.join(subagentsDir, 'agent-betty-1.jsonl');
    const subMeta = path.join(subagentsDir, 'agent-betty-1.meta.json');

    fs.writeFileSync(subMeta, JSON.stringify({ agentType: 'betty', model: 'claude-3-opus' }));
    const lineBetty = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-11-08T11:30:00Z',
      sessionId: 'sess-1',
      message: {
        id: 'msg-betty-1',
        model: 'claude-3-opus',
        usage: { input_tokens: 300, output_tokens: 400 },
      },
    }) + '\n';
    fs.writeFileSync(subJsonl, lineBetty);

    // JALANKAN SCAN PERTAMA
    const res1 = scanOnce(db, tmpDir, pricing, now, 7);
    assert.equal(res1.scannedFiles, 2);

    // Periksa deduplikasi: msg-norm-1 hanya masuk sekali
    const normRows = db.prepare('SELECT * FROM usage WHERE message_id = ?').all('msg-norm-1');
    assert.equal(normRows.length, 1);

    // Periksa perhitungan harga msg-norm-1:
    // (1000 * 15 + 2000 * 75 + 100 * 1.5 + 200 * 18.75) / 1_000_000
    // = (15000 + 150000 + 150 + 3750) / 1_000_000 = 168900 / 1_000_000 = 0.1689
    const rowNorm = normRows[0] as {
      persona: string;
      cost_usd: number | null;
      input: number;
      output: number;
      cache_read: number;
      cache_write: number;
      thinking: number;
    };
    assert.equal(rowNorm.persona, 'greg');
    assert.equal(rowNorm.input, 1000);
    assert.equal(rowNorm.output, 2000);
    assert.equal(rowNorm.cache_read, 100);
    assert.equal(rowNorm.cache_write, 200);
    assert.equal(rowNorm.thinking, 50);
    assert.equal(rowNorm.cost_usd, 0.1689);

    // Periksa baris > 7 hari dilewati
    const oldRows = db.prepare('SELECT * FROM usage WHERE message_id = ?').all('msg-old-1');
    assert.equal(oldRows.length, 0);

    // Periksa model tanpa harga menghasilkan cost_usd = null
    const noPriceRow = db
      .prepare('SELECT cost_usd, model FROM usage WHERE message_id = ?')
      .get('msg-noprice-1') as { cost_usd: number | null; model: string };
    assert.ok(noPriceRow);
    assert.equal(noPriceRow.model, 'unpriced-experimental-model');
    assert.equal(noPriceRow.cost_usd, null);

    // Periksa subagent meta betty menghasilkan persona betty
    const bettyRow = db
      .prepare('SELECT persona FROM usage WHERE message_id = ?')
      .get('msg-betty-1') as { persona: string };
    assert.ok(bettyRow);
    assert.equal(bettyRow.persona, 'betty');

    // SCAN KEDUA TANPA PERUBAHAN → tidak menambah baris
    const res2 = scanOnce(db, tmpDir, pricing, now, 7);
    assert.equal(res2.newUsageRows, 0);

    // BARIS TAK LENGKAP DI AKHIR: tidak diproses sampai lengkap
    const incompleteLine = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-11-08T11:45:00Z',
      sessionId: 'sess-1',
      message: {
        id: 'msg-incomplete-1',
        model: 'claude-3-opus',
        usage: { input_tokens: 50, output_tokens: 50 },
      },
    }); // tidak ada '\n' di akhir
    fs.appendFileSync(mainJsonl, incompleteLine);

    const resIncomplete = scanOnce(db, tmpDir, pricing, now, 7);
    assert.equal(resIncomplete.newUsageRows, 0);
    const incompleteCheck = db.prepare('SELECT * FROM usage WHERE message_id = ?').all('msg-incomplete-1');
    assert.equal(incompleteCheck.length, 0);

    // Sekarang lengkapi baris dengan '\n'
    fs.appendFileSync(mainJsonl, '\n');
    const resCompleted = scanOnce(db, tmpDir, pricing, now, 7);
    assert.equal(resCompleted.newUsageRows, 1);
    const completedCheck = db.prepare('SELECT * FROM usage WHERE message_id = ?').all('msg-incomplete-1');
    assert.equal(completedCheck.length, 1);

    db.close();
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
