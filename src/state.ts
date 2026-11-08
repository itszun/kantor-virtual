import { DatabaseSync } from 'node:sqlite';
import type { Persona } from './config.ts';

export interface PersonaSnapshot {
  id: string;
  name: string;
  role: string;
  color: string;
  state: 'idle' | 'working';
  spot: string;
  task: {
    id: string;
    title: string | null;
    level: string | null;
    started_at: string;
  } | null;
  last_active_at: string | null;
}

export interface StatsSnapshot {
  delegations_today: number;
  active_now: number;
  tokens_today: number;
  cost_today_usd: number | null;
}

export interface Snapshot {
  ts: string;
  personas: PersonaSnapshot[];
  stats: StatsSnapshot;
}

export function getJakartaTodayBounds(now: Date = new Date()): { startIso: string; endIso: string } {
  const jktDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const startIso = new Date(`${jktDate}T00:00:00+07:00`).toISOString();
  const endIso = new Date(`${jktDate}T23:59:59.999+07:00`).toISOString();
  return { startIso, endIso };
}

export function getSnapshot(db: DatabaseSync, personas: Persona[]): Snapshot {
  const now = new Date();
  const { startIso, endIso } = getJakartaTodayBounds(now);

  const personaSnapshots: PersonaSnapshot[] = [];
  let activeNow = 0;

  for (const persona of personas) {
    const runningTask = db
      .prepare(
        `SELECT task_id, title, level, started_at FROM tasks WHERE persona = ? AND status = 'running' ORDER BY started_at DESC LIMIT 1`
      )
      .get(persona.id) as { task_id: string; title: string | null; level: string | null; started_at: string } | undefined;

    const lastTsRow = db
      .prepare(`SELECT MAX(ts) as last_ts FROM events WHERE persona = ?`)
      .get(persona.id) as { last_ts: string | null } | undefined;

    const isWorking = !!runningTask;
    if (isWorking) {
      activeNow++;
    }

    personaSnapshots.push({
      id: persona.id,
      name: persona.name,
      role: persona.role,
      color: persona.color,
      state: isWorking ? 'working' : 'idle',
      spot: isWorking ? persona.desk_spot : 'lounge',
      task: isWorking
        ? {
            id: runningTask.task_id,
            title: runningTask.title,
            level: runningTask.level,
            started_at: runningTask.started_at,
          }
        : null,
      last_active_at: lastTsRow?.last_ts ?? null,
    });
  }

  // Stats
  const delRow = db
    .prepare(`SELECT COUNT(*) as count FROM tasks WHERE started_at >= ? AND started_at <= ?`)
    .get(startIso, endIso) as { count: number } | undefined;
  const delegationsToday = delRow?.count ? Number(delRow.count) : 0;

  const tokenRow = db
    .prepare(
      `SELECT SUM(input + output + cache_read + cache_write) as total_tokens FROM usage WHERE ts >= ? AND ts <= ?`
    )
    .get(startIso, endIso) as { total_tokens: number | null } | undefined;
  const tokensToday = tokenRow?.total_tokens ? Number(tokenRow.total_tokens) : 0;

  const costRow = db
    .prepare(
      `SELECT SUM(cost_usd) as total_cost, COUNT(cost_usd) as cost_count FROM usage WHERE ts >= ? AND ts <= ?`
    )
    .get(startIso, endIso) as { total_cost: number | null; cost_count: number } | undefined;
  const costTodayUsd =
    costRow && costRow.cost_count > 0 && costRow.total_cost !== null
      ? Math.round(Number(costRow.total_cost) * 1000000) / 1000000
      : null;

  return {
    ts: now.toISOString(),
    personas: personaSnapshots,
    stats: {
      delegations_today: delegationsToday,
      active_now: activeNow,
      tokens_today: tokensToday,
      cost_today_usd: costTodayUsd,
    },
  };
}

export function sweepStale(
  db: DatabaseSync,
  staleMinClaude: number = 30,
  staleMinAgy: number = 60
): number {
  const runningTasks = db
    .prepare(`SELECT task_id, source, started_at FROM tasks WHERE status = 'running'`)
    .all() as Array<{ task_id: string; source: string; started_at: string }>;

  const now = Date.now();
  let sweptCount = 0;

  for (const t of runningTasks) {
    const limitMinutes = t.source === 'agy' ? staleMinAgy : staleMinClaude;
    const startTime = new Date(t.started_at).getTime();
    if (now - startTime > limitMinutes * 60 * 1000) {
      db.prepare(`UPDATE tasks SET status = 'stale', ended_at = ? WHERE task_id = ?`).run(
        new Date(now).toISOString(),
        t.task_id
      );
      sweptCount++;
    }
  }

  return sweptCount;
}

export function getRecentTasks(db: DatabaseSync, limit: number = 40): unknown[] {
  const safeLimit = Math.min(200, Math.max(1, limit));
  return db
    .prepare(
      `SELECT task_id, persona, title, level, source, started_at, ended_at, status FROM tasks ORDER BY started_at DESC LIMIT ?`
    )
    .all(safeLimit);
}
