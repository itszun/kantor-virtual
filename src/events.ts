import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';

export interface UsagePayload {
  input_tokens?: number;
  output_tokens?: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
  thinking_tokens?: number;
  input?: number;
  output?: number;
  cache_read?: number;
  cache_write?: number;
  thinking?: number;
  message_id?: string;
}

export interface KantorEvent {
  source?: string;
  persona: string;
  type: string;
  task_id?: string;
  title?: string;
  level?: 'technical' | 'tactical' | null;
  model?: string;
  usage?: UsagePayload;
  cost_usd?: number | null;
  ts?: string;
  message_id?: string;
}

const ALLOWED_ROOT_KEYS = new Set([
  'source',
  'persona',
  'type',
  'task_id',
  'title',
  'level',
  'model',
  'usage',
  'cost_usd',
  'ts',
  'message_id',
]);

const VALID_TYPES = new Set([
  'task.start',
  'task.end',
  'task.fail',
  'prompt',
  'heartbeat',
  'usage',
]);

export interface ValidationResult {
  ok: boolean;
  error?: string;
  data?: KantorEvent;
}

export function validateEvent(
  body: unknown,
  allowedPersonas: Set<string>
): ValidationResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Body harus berupa JSON object' };
  }

  const raw = body as Record<string, unknown>;

  // Reject unknown keys at root
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_ROOT_KEYS.has(key)) {
      return { ok: false, error: `Field tak dikenal di root: ${key}` };
    }
  }

  // Persona validation
  if (typeof raw.persona !== 'string' || !allowedPersonas.has(raw.persona)) {
    return { ok: false, error: `Persona tak dikenal: ${raw.persona}` };
  }

  // Type validation
  if (typeof raw.type !== 'string' || !VALID_TYPES.has(raw.type)) {
    return { ok: false, error: `Type tak dikenal: ${raw.type}` };
  }

  // Source validation
  if (raw.source !== undefined && raw.source !== null && typeof raw.source !== 'string') {
    return { ok: false, error: 'source harus berupa string' };
  }

  // Level validation
  if (raw.level !== undefined && raw.level !== null) {
    if (raw.level !== 'technical' && raw.level !== 'tactical') {
      return { ok: false, error: 'level harus technical, tactical, atau null' };
    }
  }

  // Title validation & slice to 120 chars
  let title: string | undefined = undefined;
  if (raw.title !== undefined && raw.title !== null) {
    if (typeof raw.title !== 'string') {
      return { ok: false, error: 'title harus berupa string' };
    }
    title = raw.title.slice(0, 120);
  }

  // Model validation
  if (raw.model !== undefined && raw.model !== null && typeof raw.model !== 'string') {
    return { ok: false, error: 'model harus berupa string' };
  }

  // Usage validation
  if (raw.usage !== undefined && raw.usage !== null) {
    if (typeof raw.usage !== 'object' || Array.isArray(raw.usage)) {
      return { ok: false, error: 'usage harus berupa object' };
    }
    const usageObj = raw.usage as Record<string, unknown>;
    const tokenKeys = [
      'input_tokens',
      'output_tokens',
      'cache_read_tokens',
      'cache_write_tokens',
      'thinking_tokens',
      'input',
      'output',
      'cache_read',
      'cache_write',
      'thinking',
    ];
    for (const key of tokenKeys) {
      const val = usageObj[key];
      if (val !== undefined && val !== null) {
        if (!Number.isInteger(val) || (val as number) < 0) {
          return { ok: false, error: `usage.${key} harus bilangan bulat >= 0` };
        }
      }
    }
    if (usageObj.message_id !== undefined && usageObj.message_id !== null) {
      if (typeof usageObj.message_id !== 'string') {
        return { ok: false, error: 'usage.message_id harus string' };
      }
    }
  }

  // Cost validation
  if (raw.cost_usd !== undefined && raw.cost_usd !== null) {
    if (typeof raw.cost_usd !== 'number' || Number.isNaN(raw.cost_usd) || raw.cost_usd < 0) {
      return { ok: false, error: 'cost_usd harus berupa angka non-negatif' };
    }
  }

  // TS validation
  if (raw.ts !== undefined && raw.ts !== null) {
    if (typeof raw.ts !== 'string' || Number.isNaN(new Date(raw.ts).getTime())) {
      return { ok: false, error: 'ts harus berupa string ISO-8601 yang valid' };
    }
  }

  // Task ID validation
  if (raw.task_id !== undefined && raw.task_id !== null && typeof raw.task_id !== 'string') {
    return { ok: false, error: 'task_id harus berupa string' };
  }

  const validatedData: KantorEvent = {
    source: (raw.source as string) || 'manual',
    persona: raw.persona as string,
    type: raw.type as string,
    task_id: (raw.task_id as string) || undefined,
    title,
    level: (raw.level as 'technical' | 'tactical' | null) ?? null,
    model: (raw.model as string) || undefined,
    usage: (raw.usage as UsagePayload) || undefined,
    cost_usd: (raw.cost_usd as number | null) ?? null,
    ts: (raw.ts as string) || undefined,
    message_id: (raw.message_id as string) || undefined,
  };

  return { ok: true, data: validatedData };
}

export function ingest(db: DatabaseSync, event: KantorEvent): void {
  const ts = event.ts ? new Date(event.ts).toISOString() : new Date().toISOString();
  const source = event.source || 'manual';
  const title = event.title ? event.title.slice(0, 120) : null;
  const level = event.level ?? null;
  const model = event.model ?? null;

  // 1. Simpan ke events
  db.prepare(`
    INSERT INTO events (ts, source, persona, type, task_id, title, level, model, payload_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ts,
    source,
    event.persona,
    event.type,
    event.task_id ?? null,
    title,
    level,
    model,
    JSON.stringify(event)
  );

  // 2. task.start
  if (event.type === 'task.start') {
    const taskId = event.task_id || crypto.randomUUID();
    db.prepare(`
      INSERT INTO tasks (task_id, persona, title, level, source, started_at, ended_at, status)
      VALUES (?, ?, ?, ?, ?, ?, NULL, 'running')
      ON CONFLICT(task_id) DO UPDATE SET
        persona = excluded.persona,
        title = excluded.title,
        level = excluded.level,
        source = excluded.source,
        started_at = excluded.started_at,
        ended_at = NULL,
        status = 'running'
    `).run(taskId, event.persona, title, level, source, ts);
  }

  // 3. task.end / task.fail
  if (event.type === 'task.end' || event.type === 'task.fail') {
    const newStatus = event.type === 'task.end' ? 'done' : 'failed';
    let targetTaskId = event.task_id;
    if (!targetTaskId) {
      const row = db
        .prepare(`SELECT task_id FROM tasks WHERE persona = ? AND status = 'running' ORDER BY started_at DESC LIMIT 1`)
        .get(event.persona) as { task_id: string } | undefined;
      targetTaskId = row?.task_id;
    }
    if (targetTaskId) {
      db.prepare(`UPDATE tasks SET status = ?, ended_at = ? WHERE task_id = ?`).run(
        newStatus,
        ts,
        targetTaskId
      );
    }
  }

  // 4. usage atau event dengan usage
  if (event.type === 'usage' || event.usage) {
    const usageObj = event.usage || {};
    const input = usageObj.input_tokens ?? usageObj.input ?? 0;
    const output = usageObj.output_tokens ?? usageObj.output ?? 0;
    const cacheRead = usageObj.cache_read_tokens ?? usageObj.cache_read ?? 0;
    const cacheWrite = usageObj.cache_write_tokens ?? usageObj.cache_write ?? 0;
    const thinking = usageObj.thinking_tokens ?? usageObj.thinking ?? 0;
    const messageId = event.message_id ?? usageObj.message_id ?? null;
    const costUsd = event.cost_usd ?? null;

    db.prepare(`
      INSERT OR IGNORE INTO usage (ts, persona, source, model, message_id, input, output, cache_read, cache_write, thinking, cost_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ts, event.persona, source, model, messageId, input, output, cacheRead, cacheWrite, thinking, costUsd);
  }
}
