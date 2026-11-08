import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function resolveHomePath(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

async function sendKantorEvent(event: Record<string, unknown>): Promise<void> {
  const tokenFilePath = resolveHomePath(
    process.env.KANTOR_INGEST_TOKEN_FILE || path.join(os.homedir(), '.config', 'kantor', 'ingest_token')
  );

  let token = '';
  try {
    if (fs.existsSync(tokenFilePath)) {
      token = fs.readFileSync(tokenFilePath, 'utf8').trim();
    }
  } catch {
    // Abaikan kegagalan baca token
  }

  const kantorUrl = (process.env.KANTOR_URL || 'http://127.0.0.1:8790').replace(/\/+$/, '');
  const targetUrl = `${kantorUrl}/api/events`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      process.stderr.write(`Peringatan: Gagal mengirim event ke kantor API (status ${res.status}): ${errText}\n`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Peringatan: Gagal mengirim event ke kantor API: ${msg}\n`);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  const rawArgs = process.argv.slice(2);

  const dashDashIdx = rawArgs.indexOf('--');
  let wrapperArgs: string[];
  let codexArgs: string[];

  if (dashDashIdx !== -1) {
    wrapperArgs = rawArgs.slice(0, dashDashIdx);
    codexArgs = rawArgs.slice(dashDashIdx + 1);
  } else {
    wrapperArgs = [];
    codexArgs = [];
    let i = 0;
    while (i < rawArgs.length) {
      const arg = rawArgs[i];
      if (arg === '--title' || arg === '--task-id') {
        wrapperArgs.push(arg);
        if (i + 1 < rawArgs.length) {
          wrapperArgs.push(rawArgs[i + 1]);
          i += 2;
        } else {
          i++;
        }
      } else if (arg.startsWith('--title=') || arg.startsWith('--task-id=')) {
        wrapperArgs.push(arg);
        i++;
      } else {
        codexArgs.push(...rawArgs.slice(i));
        break;
      }
    }
  }

  let title: string | undefined = undefined;
  let taskId: string | undefined = undefined;

  for (let i = 0; i < wrapperArgs.length; i++) {
    const arg = wrapperArgs[i];
    if (arg === '--title' && i + 1 < wrapperArgs.length) {
      title = wrapperArgs[++i];
    } else if (arg.startsWith('--title=')) {
      title = arg.slice('--title='.length);
    } else if (arg === '--task-id' && i + 1 < wrapperArgs.length) {
      taskId = wrapperArgs[++i];
    } else if (arg.startsWith('--task-id=')) {
      taskId = arg.slice('--task-id='.length);
    }
  }

  const persona = 'codex';
  if (!taskId) {
    taskId = 'tsk-codex-' + crypto.randomUUID().slice(0, 8);
  }
  if (!title) {
    title = codexArgs.length > 0 ? codexArgs.join(' ') : 'Tugas review Codex';
  }
  if (title.length > 120) {
    title = title.slice(0, 117) + '...';
  }

  // Kirim event task.start
  await sendKantorEvent({
    source: 'codex',
    persona,
    type: 'task.start',
    task_id: taskId,
    title,
    level: 'tactical',
  });

  const binPath = process.env.FAKE_CODEX_BIN || process.env.CODEX_BIN || 'codex';

  let exitCode = 0;
  let stdoutData = '';
  let stderrData = '';

  try {
    exitCode = await new Promise<number>((resolve, reject) => {
      // Tandai proses anak agar hook native tidak mencatat tugas ganda.
      process.env.KANTOR_WRAPPED = '1';
      const child = spawn(binPath, codexArgs, {
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      child.stdout?.on('data', (d) => {
        const text = d.toString('utf8');
        stdoutData += text;
        process.stdout.write(text);
      });

      child.stderr?.on('data', (d) => {
        const text = d.toString('utf8');
        stderrData += text;
        process.stderr.write(text);
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        resolve(code ?? 0);
      });
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Gagal menjalankan subproses codex: ${msg}\n`);
    exitCode = 1;
  }

  // Kirim event task.end atau task.fail
  const endEventType = exitCode === 0 ? 'task.end' : 'task.fail';
  await sendKantorEvent({
    source: 'codex',
    persona,
    type: endEventType,
    task_id: taskId,
    title,
  });

  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(`Error fatal kantor-codex: ${err}\n`);
  process.exit(1);
});
