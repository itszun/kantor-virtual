import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mapHook } from '../src/hookmap.ts';

function resolveHomePath(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

async function main() {
  try {
    // Baca seluruh stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer);
    }
    const inputStr = Buffer.concat(chunks).toString('utf8');
    if (!inputStr.trim()) {
      process.exit(0);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(inputStr);
    } catch {
      process.exit(0);
    }

    const event = mapHook(parsed);
    if (!event) {
      process.exit(0);
    }

    const tokenFilePath = resolveHomePath(
      process.env.KANTOR_INGEST_TOKEN_FILE || path.join(os.homedir(), '.config', 'kantor', 'ingest_token')
    );

    let token = '';
    try {
      if (fs.existsSync(tokenFilePath)) {
        token = fs.readFileSync(tokenFilePath, 'utf8').trim();
      }
    } catch {
      // Abaikan bila tidak terbaca
    }

    if (!token) {
      process.exit(0);
    }

    const kantorUrl = (process.env.KANTOR_URL || 'http://127.0.0.1:8790').replace(/\/+$/, '');
    const targetUrl = `${kantorUrl}/api/events`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      });
    } catch {
      // Abaikan kegagalan jaringan / timeout
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    // Pastikan tidak ada unhandled rejection
  } finally {
    process.exit(0);
  }
}

main();
