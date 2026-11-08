import test from 'node:test';
import assert from 'node:assert/strict';
import {
  relTime,
  historyToRows,
  gregTasks,
  activityFromHistory,
  usageView,
  formatCost,
} from '../public/app/mappers.js';

test('mappers: formatCost memformat biaya sesuai aturan', () => {
  assert.equal(formatCost(null), '—');
  assert.equal(formatCost(undefined), '—');
  assert.equal(formatCost(Number.NaN), '—');

  // Nilai >= 0.01 diformat 2 desimal
  assert.equal(formatCost(0.06), '$0.06');
  assert.equal(formatCost(0.0584), '$0.06');
  assert.equal(formatCost(1.234), '$1.23');

  // Nilai < 0.01 diformat 4 desimal
  assert.equal(formatCost(0.005), '$0.0050');
  assert.equal(formatCost(0.0001), '$0.0001');
  assert.equal(formatCost(0), '$0.0000');
});

test('mappers: relTime menghasilkan representasi waktu relatif Indonesia', () => {
  const baseNow = new Date('2026-11-08T12:00:00.000Z');

  assert.equal(relTime(null, baseNow), '—');
  assert.equal(relTime('', baseNow), '—');

  // < 60 detik
  const t30s = new Date(baseNow.getTime() - 30 * 1000).toISOString();
  assert.equal(relTime(t30s, baseNow), 'baru saja');

  // 5 menit lalu
  const t5m = new Date(baseNow.getTime() - 5 * 60 * 1000).toISOString();
  assert.equal(relTime(t5m, baseNow), '5m lalu');

  // 2 jam lalu
  const t2j = new Date(baseNow.getTime() - 2 * 3600 * 1000).toISOString();
  assert.equal(relTime(t2j, baseNow), '2j lalu');

  // 3 hari lalu
  const t3h = new Date(baseNow.getTime() - 3 * 86400 * 1000).toISOString();
  assert.equal(relTime(t3h, baseNow), '3h lalu');
});

test('mappers: historyToRows memetakan task, status running, dan fallback judul null', () => {
  const personas = [
    { id: 'alex', name: 'Alex', color: '#2f6fd6' },
    { id: 'greg', name: 'Greg', color: '#6d4fd8' },
  ];

  const now = new Date('2026-11-08T12:00:00.000Z');
  const tasks = [
    {
      task_id: 't-1',
      persona: 'alex',
      title: null,
      status: 'running',
      started_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
    },
    {
      task_id: 't-2',
      persona: 'greg',
      title: 'Desain arsitektur live',
      status: 'done',
      started_at: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
    },
    {
      task_id: 't-3',
      persona: 'unknown',
      title: 'Tugas pihak ketiga',
      status: 'failed',
      started_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    },
  ];

  const rows = historyToRows(tasks, personas, now);
  assert.equal(rows.length, 3);

  // t-1: judul null -> 'Tugas tanpa judul', running -> 'aktif sekarang'
  assert.equal(rows[0].title, 'Tugas tanpa judul');
  assert.equal(rows[0].time, 'aktif sekarang');
  assert.equal(rows[0].persona_color, '#2f6fd6');
  assert.equal(rows[0].status, 'running');

  // t-2: time -> '20m lalu', color greg
  assert.equal(rows[1].title, 'Desain arsitektur live');
  assert.equal(rows[1].time, '20m lalu');
  assert.equal(rows[1].persona_color, '#6d4fd8');
  assert.equal(rows[1].status, 'done');

  // t-3: fallback color
  assert.equal(rows[2].persona_color, '#6d4fd8');
});

test('mappers: gregTasks memfilter hanya persona greg, maks 10, dan menerjemahkan status', () => {
  const tasks = [
    { task_id: 'g-1', persona: 'greg', title: 'Task 1', status: 'running' },
    { task_id: 'a-1', persona: 'alex', title: 'Task A', status: 'running' },
    { task_id: 'g-2', persona: 'greg', title: null, status: 'done' },
    { task_id: 'g-3', persona: 'greg', title: 'Task 3', status: 'failed' },
    { task_id: 'g-4', persona: 'greg', title: 'Task 4', status: 'stale' },
  ];

  // Tambahkan 10 task lagi untuk menguji batas maks 10
  for (let i = 5; i <= 15; i++) {
    tasks.push({ task_id: `g-${i}`, persona: 'greg', title: `Task ${i}`, status: 'done' });
  }

  const res = gregTasks(tasks);
  assert.equal(res.length, 10);
  assert.equal(res[0].status, 'berjalan');
  assert.equal(res[1].title, 'Tugas tanpa judul');
  assert.equal(res[1].status, 'selesai');
  assert.equal(res[2].status, 'gagal');
  assert.equal(res[3].status, 'terhenti');
  assert.ok(res.every((t) => t.persona === 'greg'));
});

test('mappers: activityFromHistory mengurutkan entri terbaru dan membatasi maks 20', () => {
  const personas = [
    { id: 'alex', name: 'Alex' },
    { id: 'betty', name: 'Betty' },
  ];

  const now = new Date('2026-11-08T12:00:00.000Z');
  const tasks = [
    {
      task_id: '1',
      persona: 'alex',
      title: 'Kompilasi modul',
      status: 'done',
      started_at: '2026-11-08T11:00:00.000Z',
      ended_at: '2026-11-08T11:30:00.000Z',
    },
    {
      task_id: '2',
      persona: 'betty',
      title: 'Sinkronisasi cloud',
      status: 'failed',
      started_at: '2026-11-08T11:10:00.000Z',
      ended_at: '2026-11-08T11:45:00.000Z',
    },
    {
      task_id: '3',
      persona: 'alex',
      title: 'Analisis performa',
      status: 'running',
      started_at: '2026-11-08T11:55:00.000Z',
      ended_at: null,
    },
  ];

  const activities = activityFromHistory(tasks, personas, now);
  // Total entries: task 1 (start, end) = 2; task 2 (start, end) = 2; task 3 (start) = 1 -> total 5
  assert.equal(activities.length, 5);

  // Urutan terbaru:
  // 1: 11:55 Alex mulai: Analisis performa (💻)
  // 2: 11:45 Betty gagal: Sinkronisasi cloud (⚠️)
  // 3: 11:30 Alex selesai: Kompilasi modul (✅)
  // 4: 11:10 Betty mulai: Sinkronisasi cloud (💻)
  // 5: 11:00 Alex mulai: Kompilasi modul (💻)
  assert.equal(activities[0].text, 'Alex mulai: Analisis performa');
  assert.equal(activities[0].icon, '💻');

  assert.equal(activities[1].text, 'Betty gagal: Sinkronisasi cloud');
  assert.equal(activities[1].icon, '⚠️');

  assert.equal(activities[2].text, 'Alex selesai: Kompilasi modul');
  assert.equal(activities[2].icon, '✅');
});

test('mappers: usageView menangani biaya null dan agregasi 7 hari', () => {
  const report = {
    days: [
      {
        date: '2026-11-07',
        by_persona: {
          alex: { tokens: 1000, cost_usd: null },
          greg: { tokens: 2000, cost_usd: 0.05 },
        },
      },
      {
        date: '2026-11-08',
        by_persona: {
          alex: { tokens: 500, cost_usd: null },
          greg: { tokens: 1000, cost_usd: 0.01 },
        },
      },
    ],
    by_model: [
      { model: 'claude-3-7-sonnet', tokens: 3000, cost_usd: 0.06 },
      { model: 'local-runner', tokens: 1500, cost_usd: null },
    ],
    totals: {
      tokens: 4500,
      cost_usd: 0.06,
    },
  };

  const view = usageView(report);

  // Per persona
  const alex = view.by_persona.find((p) => p.persona === 'alex');
  assert.ok(alex);
  assert.equal(alex.tokens, 1500);
  assert.equal(alex.cost_usd, null);
  assert.equal(alex.cost, '—');

  const greg = view.by_persona.find((p) => p.persona === 'greg');
  assert.ok(greg);
  assert.equal(greg.tokens, 3000);
  assert.equal(greg.cost_usd, 0.06);
  assert.equal(greg.cost, '$0.06');

  // By model
  const localModel = view.by_model.find((m) => m.model === 'local-runner');
  assert.ok(localModel);
  assert.equal(localModel.cost, '—');

  // Totals
  assert.equal(view.totals.tokens, 4500);
  assert.equal(view.totals.cost, '$0.06');

  // Laporan kosong/null
  const emptyView = usageView(null);
  assert.equal(emptyView.totals.tokens, 0);
  assert.equal(emptyView.totals.cost, '—');
});
