/**
 * mappers.js - Fungsi murni pemetaan data backend ke representasi UI.
 * Tanpa import Three.js atau DOM agar dapat diuji di Node.js.
 */

/**
 * Format biaya USD.
 * null/undefined/NaN -> "—"
 * >= 0.01 -> 2 desimal (e.g. "$0.06")
 * < 0.01 -> 4 desimal (e.g. "$0.0050", "$0.0000")
 */
export function formatCost(usd) {
  if (usd == null || isNaN(usd)) return '—';
  const num = Number(usd);
  if (num >= 0.01) {
    return '$' + num.toFixed(2);
  }
  return '$' + num.toFixed(4);
}

/**
 * Format waktu relatif dalam Bahasa Indonesia.
 * < 60 detik -> "baru saja"
 * < 60 menit -> "Nm lalu" (e.g. "5m lalu")
 * < 24 jam   -> "Nj lalu" (e.g. "2j lalu")
 * >= 24 jam  -> "Nh lalu" (e.g. "3h lalu")
 */
export function relTime(iso, now = new Date()) {
  if (!iso) return '—';
  const targetTime = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso).getTime() : iso.getTime();
  if (isNaN(targetTime)) return '—';

  const nowTime = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const diffSec = Math.floor((nowTime - targetTime) / 1000);

  if (diffSec < 60) {
    return 'baru saja';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}m lalu`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}j lalu`;
  }
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}h lalu`;
}

function getPersonaHelper(personas) {
  const map = new Map();
  if (Array.isArray(personas)) {
    for (const p of personas) {
      if (p && p.id) map.set(p.id, p);
    }
  } else if (personas instanceof Map) {
    for (const [k, v] of personas.entries()) {
      map.set(k, v);
    }
  }
  return map;
}

/**
 * Konversi daftar task dari /api/history menjadi baris riwayat UI.
 * task tanpa judul -> "Tugas tanpa judul"
 * status running -> time "aktif sekarang"
 */
export function historyToRows(tasks, personas = [], now = new Date()) {
  if (!Array.isArray(tasks)) return [];
  const pMap = getPersonaHelper(personas);

  return tasks.map((t) => {
    const title = t.title && t.title.trim() ? t.title : 'Tugas tanpa judul';
    const isRunning = t.status === 'running';
    const time = isRunning ? 'aktif sekarang' : relTime(t.started_at, now);
    const pInfo = pMap.get(t.persona);
    const persona_color = pInfo?.color || '#6d4fd8';

    return {
      task_id: t.task_id,
      persona: t.persona,
      title,
      time,
      persona_color,
      status: t.status,
      started_at: t.started_at,
      ended_at: t.ended_at,
    };
  });
}

/**
 * Filter task untuk persona Greg, maks 10, status diterjemahkan ke Bahasa Indonesia:
 * running -> "berjalan"
 * done -> "selesai"
 * failed -> "gagal"
 * stale -> "terhenti"
 */
export function gregTasks(tasks) {
  if (!Array.isArray(tasks)) return [];

  const statusMap = {
    running: 'berjalan',
    done: 'selesai',
    failed: 'gagal',
    stale: 'terhenti',
  };

  return tasks
    .filter((t) => t.persona === 'greg')
    .slice(0, 10)
    .map((t) => ({
      task_id: t.task_id,
      persona: 'greg',
      title: t.title && t.title.trim() ? t.title : 'Tugas tanpa judul',
      status: statusMap[t.status] || t.status || 'antre',
      started_at: t.started_at,
      ended_at: t.ended_at,
    }));
}

/**
 * Bentuk log aktivitas dari riwayat task:
 * start -> "Alex mulai: <judul>" (💻)
 * end/done -> "Alex selesai: <judul>" (✅)
 * failed -> "Alex gagal: <judul>" (⚠️)
 * stale -> "Alex terhenti: <judul>" (⚠️)
 * Urut terbaru berdasarkan timestamp, maks 20.
 */
export function activityFromHistory(tasks, personas = [], now = new Date()) {
  if (!Array.isArray(tasks)) return [];
  const pMap = getPersonaHelper(personas);
  const entries = [];

  for (const t of tasks) {
    const pInfo = pMap.get(t.persona);
    const pName = pInfo?.name || (t.persona ? t.persona.charAt(0).toUpperCase() + t.persona.slice(1) : 'Seseorang');
    const title = t.title && t.title.trim() ? t.title : 'Tugas tanpa judul';

    // Start event
    if (t.started_at) {
      entries.push({
        text: `${pName} mulai: ${title}`,
        time: relTime(t.started_at, now),
        ts: t.started_at,
        icon: '💻',
      });
    }

    // Completion / failure event
    if (t.ended_at) {
      if (t.status === 'done') {
        entries.push({
          text: `${pName} selesai: ${title}`,
          time: relTime(t.ended_at, now),
          ts: t.ended_at,
          icon: '✅',
        });
      } else if (t.status === 'failed') {
        entries.push({
          text: `${pName} gagal: ${title}`,
          time: relTime(t.ended_at, now),
          ts: t.ended_at,
          icon: '⚠️',
        });
      } else if (t.status === 'stale') {
        entries.push({
          text: `${pName} terhenti: ${title}`,
          time: relTime(t.ended_at, now),
          ts: t.ended_at,
          icon: '⚠️',
        });
      }
    }
  }

  // Urutkan terbaru lebih dulu
  entries.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  return entries.slice(0, 20);
}

/**
 * Pemetaan ringkasan penggunaan token 7 hari dari /api/usage:
 * per persona total token & biaya 7 hari, per model, total.
 * Biaya null -> "—".
 */
export function usageView(report) {
  if (!report) {
    return {
      by_persona: [],
      personas: [],
      by_model: [],
      models: [],
      totals: { tokens: 0, cost_usd: null, cost: '—' },
    };
  }

  // Agregasi per persona dari report.days
  const personaMap = new Map();
  if (Array.isArray(report.days)) {
    for (const day of report.days) {
      if (day.by_persona) {
        for (const [id, data] of Object.entries(day.by_persona)) {
          if (!personaMap.has(id)) {
            personaMap.set(id, { persona: id, tokens: 0, cost_usd: 0, hasCost: false });
          }
          const p = personaMap.get(id);
          p.tokens += data.tokens || 0;
          if (data.cost_usd !== null && data.cost_usd !== undefined) {
            p.cost_usd += Number(data.cost_usd);
            p.hasCost = true;
          }
        }
      }
    }
  }

  const byPersona = Array.from(personaMap.values()).map((p) => {
    const cost_usd = p.hasCost ? Math.round(p.cost_usd * 1000000) / 1000000 : null;
    return {
      persona: p.persona,
      tokens: p.tokens,
      cost_usd,
      cost: formatCost(cost_usd),
      cost_formatted: formatCost(cost_usd),
    };
  });

  const byModel = (Array.isArray(report.by_model) ? report.by_model : []).map((m) => {
    const cost_usd = m.cost_usd !== null && m.cost_usd !== undefined ? Number(m.cost_usd) : null;
    return {
      model: m.model || '—',
      tokens: m.tokens || 0,
      cost_usd,
      cost: formatCost(cost_usd),
      cost_formatted: formatCost(cost_usd),
    };
  });

  const totalCost = report.totals?.cost_usd !== null && report.totals?.cost_usd !== undefined
    ? Number(report.totals.cost_usd)
    : null;

  const totals = {
    tokens: report.totals?.tokens || 0,
    cost_usd: totalCost,
    cost: formatCost(totalCost),
    cost_formatted: formatCost(totalCost),
  };

  return {
    by_persona: byPersona,
    personas: byPersona,
    by_model: byModel,
    models: byModel,
    totals,
  };
}
