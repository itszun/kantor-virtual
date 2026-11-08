import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { costFor, type PricingConfig } from './pricing.ts';

export interface ScanResult {
  scannedFiles: number;
  processedLines: number;
  newUsageRows: number;
}

function findJsonlFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsonlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      results.push(fullPath);
    }
  }
  return results;
}

export function scanOnce(
  db: DatabaseSync,
  rootDir: string,
  pricing?: PricingConfig,
  now: Date = new Date(),
  maxAgeDays: number = 7
): ScanResult {
  const result: ScanResult = {
    scannedFiles: 0,
    processedLines: 0,
    newUsageRows: 0,
  };

  if (!fs.existsSync(rootDir)) {
    return result;
  }

  const jsonlFiles = findJsonlFiles(rootDir);
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  const insertUsageStmt = db.prepare(`
    INSERT OR IGNORE INTO usage (ts, persona, source, model, message_id, input, output, cache_read, cache_write, thinking, cost_usd)
    VALUES (?, ?, 'claude-transcript', ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const updateOffsetStmt = db.prepare(`
    INSERT INTO scan_offsets (file_path, byte_offset, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(file_path) DO UPDATE SET
      byte_offset = excluded.byte_offset,
      updated_at = excluded.updated_at
  `);

  for (const filePath of jsonlFiles) {
    result.scannedFiles++;
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }

    const fileSize = stat.size;
    const row = db
      .prepare('SELECT byte_offset FROM scan_offsets WHERE file_path = ?')
      .get(filePath) as { byte_offset: number } | undefined;

    let offset = row ? row.byte_offset : 0;
    if (fileSize < offset) {
      offset = 0;
    }
    if (fileSize === offset) {
      continue;
    }

    const bytesToRead = fileSize - offset;
    const buffer = Buffer.alloc(bytesToRead);
    let fd: number;
    try {
      fd = fs.openSync(filePath, 'r');
    } catch {
      continue;
    }

    try {
      fs.readSync(fd, buffer, 0, bytesToRead, offset);
    } catch {
      continue;
    } finally {
      fs.closeSync(fd);
    }

    const lastNewlineIndex = buffer.lastIndexOf(0x0a);
    if (lastNewlineIndex === -1) {
      // Baris belum lengkap berakhir \n, jangan ubah offset
      continue;
    }

    const chunkToProcess = buffer.subarray(0, lastNewlineIndex + 1);
    const newOffset = offset + lastNewlineIndex + 1;

    // Tentukan persona untuk file ini
    let filePersona = 'greg';
    const parts = filePath.split(path.sep);
    const subagentsIdx = parts.lastIndexOf('subagents');
    if (subagentsIdx !== -1 && subagentsIdx === parts.length - 2) {
      const dir = path.dirname(filePath);
      const fileName = path.basename(filePath);
      const baseName = fileName.replace(/\.jsonl$/, '');
      const metaPath = path.join(dir, `${baseName}.meta.json`);
      if (fs.existsSync(metaPath)) {
        try {
          const metaContent = fs.readFileSync(metaPath, 'utf8');
          const meta = JSON.parse(metaContent);
          if (meta.agentType === 'betty') {
            filePersona = 'betty';
          }
        } catch {
          // Abaikan
        }
      }
    }

    const text = chunkToProcess.toString('utf8');
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let obj: Record<string, unknown>;
      try {
        obj = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        continue;
      }

      result.processedLines++;

      if (obj.type !== 'assistant' || !obj.message || typeof obj.message !== 'object') {
        continue;
      }

      const msg = obj.message as Record<string, unknown>;
      if (!msg.id || typeof msg.id !== 'string' || !msg.usage || typeof msg.usage !== 'object') {
        continue;
      }

      if (!obj.timestamp || typeof obj.timestamp !== 'string') {
        continue;
      }

      const lineTs = new Date(obj.timestamp);
      if (isNaN(lineTs.getTime())) {
        continue;
      }

      if (now.getTime() - lineTs.getTime() > maxAgeMs) {
        continue;
      }

      const u = msg.usage as Record<string, unknown>;
      const input = typeof u.input_tokens === 'number' ? u.input_tokens : 0;
      const output = typeof u.output_tokens === 'number' ? u.output_tokens : 0;
      const cacheRead = typeof u.cache_read_input_tokens === 'number' ? u.cache_read_input_tokens : 0;
      const cacheWrite = typeof u.cache_creation_input_tokens === 'number' ? u.cache_creation_input_tokens : 0;

      let thinking = 0;
      if (u.output_tokens_details && typeof u.output_tokens_details === 'object') {
        const otd = u.output_tokens_details as Record<string, unknown>;
        if (typeof otd.thinking_tokens === 'number') {
          thinking = otd.thinking_tokens;
        }
      }

      let w5m: number | undefined = undefined;
      let w1h: number | undefined = undefined;
      if (u.cache_creation && typeof u.cache_creation === 'object') {
        const cc = u.cache_creation as Record<string, unknown>;
        if (typeof cc.ephemeral_5m_input_tokens === 'number') {
          w5m = cc.ephemeral_5m_input_tokens;
        }
        if (typeof cc.ephemeral_1h_input_tokens === 'number') {
          w1h = cc.ephemeral_1h_input_tokens;
        }
      }

      const model = typeof msg.model === 'string' ? msg.model : null;
      const costUsd = costFor(
        model,
        {
          input,
          output,
          cache_read: cacheRead,
          cache_write: cacheWrite,
          cache_write_5m: w5m,
          cache_write_1h: w1h,
        },
        pricing
      );

      const runRes = insertUsageStmt.run(
        lineTs.toISOString(),
        filePersona,
        model,
        msg.id,
        input,
        output,
        cacheRead,
        cacheWrite,
        thinking,
        costUsd
      );

      if (runRes.changes > 0) {
        result.newUsageRows++;
      }
    }

    updateOffsetStmt.run(filePath, newOffset, now.toISOString());
  }

  return result;
}
