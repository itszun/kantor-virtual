import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function initDatabase(dbPath: string): DatabaseSync {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  // WAL mode
  try {
    db.exec('PRAGMA journal_mode = WAL;');
  } catch {
    // In-memory or environments where WAL is not supported
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      source TEXT NOT NULL,
      persona TEXT NOT NULL,
      type TEXT NOT NULL,
      task_id TEXT,
      title TEXT,
      level TEXT,
      model TEXT,
      payload_json TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      task_id TEXT PRIMARY KEY,
      persona TEXT NOT NULL,
      title TEXT,
      level TEXT,
      source TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      persona TEXT NOT NULL,
      source TEXT NOT NULL,
      model TEXT,
      message_id TEXT UNIQUE,
      input INTEGER NOT NULL DEFAULT 0,
      output INTEGER NOT NULL DEFAULT 0,
      cache_read INTEGER NOT NULL DEFAULT 0,
      cache_write INTEGER NOT NULL DEFAULT 0,
      thinking INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL
    );

    CREATE TABLE IF NOT EXISTS scan_offsets (
      file_path TEXT PRIMARY KEY,
      byte_offset INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS director_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      model TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      cost_usd REAL,
      ok INTEGER NOT NULL DEFAULT 1,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS persona_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      persona TEXT NOT NULL,
      note TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_persona_status ON tasks (persona, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_started_at ON tasks (started_at);
    CREATE INDEX IF NOT EXISTS idx_events_persona ON events (persona);
    CREATE INDEX IF NOT EXISTS idx_usage_ts ON usage (ts);
  `);

  return db;
}
