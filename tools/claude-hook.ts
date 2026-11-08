import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mapHook, mapCodexHook, mapAgyHook } from '../src/hookmap.ts';

// Pemakaian: claude-hook.sh                      (hook Claude Code, default)
//            claude-hook.sh --agent codex        (hook native Codex CLI)
//            claude-hook.sh --agent agy --event PreInvocation|Stop  (hook native agy)
// Tugas yang dijalankan lewat tools/kantor-{agy,codex}.sh membawa KANTOR_WRAPPED=1;
// hook codex/agy dilewati agar tidak tercatat ganda.
function argValue(name: string): string {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : '';
}
const AGENT = argValue('--agent') || 'claude';
const AGY_EVENT = argValue('--event');
// agy mengharapkan objek JSON di stdout.
if (AGENT === 'agy') process.stdout.write('{}\n');

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

    if (AGENT !== 'claude' && process.env.KANTOR_WRAPPED === '1') {
      process.exit(0);
    }
    const event =
      AGENT === 'codex' ? mapCodexHook(parsed)
      : AGENT === 'agy' ? mapAgyHook(AGY_EVENT, parsed)
      : mapHook(parsed);
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
