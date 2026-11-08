import type { DatabaseSync } from 'node:sqlite';
import type { Persona } from './config.ts';

export interface PersonaUsageSummary {
  tokens: number;
  cost_usd: number | null;
}

export interface DayUsageSummary {
  date: string;
  by_persona: Record<string, PersonaUsageSummary>;
}

export interface ModelUsageSummary {
  model: string;
  tokens: number;
  cost_usd: number | null;
}

export interface UsageReport {
  days: DayUsageSummary[];
  by_model: ModelUsageSummary[];
  totals: {
    tokens: number;
    cost_usd: number | null;
  };
}

export function getJakartaDateRange(
  days: number,
  now: Date = new Date()
): { dates: string[]; startIso: string; endIso: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const todayStr = formatter.format(now);
  const [y, m, d] = todayStr.split('-').map(Number);

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const targetDate = new Date(Date.UTC(y, m - 1, d - i, 5, 0, 0));
    dates.push(formatter.format(targetDate));
  }

  const startDateStr = dates[0];
  const endDateStr = dates[dates.length - 1];
  const startIso = new Date(`${startDateStr}T00:00:00+07:00`).toISOString();
  const endIso = new Date(`${endDateStr}T23:59:59.999+07:00`).toISOString();

  return { dates, startIso, endIso };
}

export function getUsageReport(
  db: DatabaseSync,
  personas: Persona[],
  daysCount: number = 7,
  now: Date = new Date()
): UsageReport {
  const safeDays = Math.min(31, Math.max(1, daysCount));
  const { dates, startIso, endIso } = getJakartaDateRange(safeDays, now);

  const jktFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  // Query usage rows dalam rentang tanggal
  interface UsageRow {
    ts: string;
    persona: string;
    model: string | null;
    input: number;
    output: number;
    cache_read: number;
    cache_write: number;
    cost_usd: number | null;
  }

  const rows = db
    .prepare(
      `SELECT ts, persona, model, input, output, cache_read, cache_write, cost_usd
       FROM usage
       WHERE ts >= ? AND ts <= ?
       ORDER BY ts ASC`
    )
    .all(startIso, endIso) as unknown as UsageRow[];

  // Siapkan peta hari
  const daysMap = new Map<
    string,
    Map<string, { tokens: number; costSum: number; hasCost: boolean }>
  >();

  for (const d of dates) {
    const personaMap = new Map<string, { tokens: number; costSum: number; hasCost: boolean }>();
    for (const p of personas) {
      personaMap.set(p.id, { tokens: 0, costSum: 0, hasCost: false });
    }
    daysMap.set(d, personaMap);
  }

  const modelMap = new Map<string, { tokens: number; costSum: number; hasCost: boolean }>();

  let totalTokens = 0;
  let totalCostSum = 0;
  let totalHasCost = false;

  for (const row of rows) {
    const rowDate = jktFormatter.format(new Date(row.ts));
    const tokens = (row.input || 0) + (row.output || 0) + (row.cache_read || 0) + (row.cache_write || 0);

    totalTokens += tokens;
    if (row.cost_usd !== null && row.cost_usd !== undefined) {
      totalCostSum += Number(row.cost_usd);
      totalHasCost = true;
    }

    // Per hari & persona
    const dayData = daysMap.get(rowDate);
    if (dayData) {
      let pEntry = dayData.get(row.persona);
      if (!pEntry) {
        pEntry = { tokens: 0, costSum: 0, hasCost: false };
        dayData.set(row.persona, pEntry);
      }
      pEntry.tokens += tokens;
      if (row.cost_usd !== null && row.cost_usd !== undefined) {
        pEntry.costSum += Number(row.cost_usd);
        pEntry.hasCost = true;
      }
    }

    // Per model
    const modelKey = row.model || 'unknown';
    let mEntry = modelMap.get(modelKey);
    if (!mEntry) {
      mEntry = { tokens: 0, costSum: 0, hasCost: false };
      modelMap.set(modelKey, mEntry);
    }
    mEntry.tokens += tokens;
    if (row.cost_usd !== null && row.cost_usd !== undefined) {
      mEntry.costSum += Number(row.cost_usd);
      mEntry.hasCost = true;
    }
  }

  // Format array days
  const daysOutput: DayUsageSummary[] = dates.map((date) => {
    const personaMap = daysMap.get(date)!;
    const by_persona: Record<string, PersonaUsageSummary> = {};

    for (const [pId, entry] of personaMap.entries()) {
      by_persona[pId] = {
        tokens: entry.tokens,
        cost_usd: entry.hasCost ? Math.round(entry.costSum * 1_000_000) / 1_000_000 : null,
      };
    }

    return {
      date,
      by_persona,
    };
  });

  // Format array by_model
  const byModelOutput: ModelUsageSummary[] = Array.from(modelMap.entries()).map(([model, entry]) => ({
    model,
    tokens: entry.tokens,
    cost_usd: entry.hasCost ? Math.round(entry.costSum * 1_000_000) / 1_000_000 : null,
  }));

  return {
    days: daysOutput,
    by_model: byModelOutput,
    totals: {
      tokens: totalTokens,
      cost_usd: totalHasCost ? Math.round(totalCostSum * 1_000_000) / 1_000_000 : null,
    },
  };
}
