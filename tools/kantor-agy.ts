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

  // Pisahkan wrapper options dan agy arguments berdasarkan '--'
  const dashDashIdx = rawArgs.indexOf('--');
  let wrapperArgs: string[];
  let agyArgs: string[];

  if (dashDashIdx !== -1) {
    wrapperArgs = rawArgs.slice(0, dashDashIdx);
    agyArgs = rawArgs.slice(dashDashIdx + 1);
  } else {
    // Jika tidak ada '--', parse wrapper flags yang ada di depan
    wrapperArgs = [];
    agyArgs = [];
    let i = 0;
    while (i < rawArgs.length) {
      const arg = rawArgs[i];
      if (arg === '--persona' || arg === '--title' || arg === '--level') {
        wrapperArgs.push(arg);
        if (i + 1 < rawArgs.length) {
          wrapperArgs.push(rawArgs[i + 1]);
          i += 2;
        } else {
          i++;
        }
      } else if (arg.startsWith('--persona=') || arg.startsWith('--title=') || arg.startsWith('--level=')) {
        wrapperArgs.push(arg);
        i++;
      } else {
        agyArgs.push(...rawArgs.slice(i));
        break;
      }
    }
  }

  // Parse wrapper arguments
  let persona = '';
  let title: string | undefined = undefined;
  let level: 'technical' | 'tactical' | undefined = undefined;

  for (let i = 0; i < wrapperArgs.length; i++) {
    const arg = wrapperArgs[i];
    if (arg === '--persona' && i + 1 < wrapperArgs.length) {
      persona = wrapperArgs[++i];
    } else if (arg.startsWith('--persona=')) {
      persona = arg.slice('--persona='.length);
    } else if (arg === '--title' && i + 1 < wrapperArgs.length) {
      title = wrapperArgs[++i];
    } else if (arg.startsWith('--title=')) {
      title = arg.slice('--title='.length);
    } else if (arg === '--level' && i + 1 < wrapperArgs.length) {
      const val = wrapperArgs[++i];
      if (val === 'technical' || val === 'tactical') {
        level = val;
      }
    } else if (arg.startsWith('--level=')) {
      const val = arg.slice('--level='.length);
      if (val === 'technical' || val === 'tactical') {
        level = val;
      }
    }
  }

  if (persona !== 'alex' && persona !== 'windry') {
    process.stderr.write('Error: persona harus alex atau windry\n');
    process.exit(2);
  }

  if (!level) {
    level = persona === 'alex' ? 'technical' : 'tactical';
  }

  // Cari prompt (-p atau --print) dan model (--model) dari agyArgs
  let promptText = '';
  let model: string | undefined = undefined;
  let hasPrintArg = false;
  let hasOutputFormat = false;

  for (let i = 0; i < agyArgs.length; i++) {
    const a = agyArgs[i];
    if (a === '-p' || a === '--print') {
      hasPrintArg = true;
      if (i + 1 < agyArgs.length) {
        promptText = agyArgs[i + 1];
      }
    } else if (a.startsWith('-p=')) {
      hasPrintArg = true;
      promptText = a.slice(3);
    } else if (a.startsWith('--print=')) {
      hasPrintArg = true;
      promptText = a.slice('--print='.length);
    } else if (a === '--output-format' || a.startsWith('--output-format=')) {
      hasOutputFormat = true;
    } else if (a === '--model' && i + 1 < agyArgs.length) {
      model = agyArgs[i + 1];
    } else if (a.startsWith('--model=')) {
      model = a.slice('--model='.length);
    }
  }

  // Jika ada -p/--print dan tidak ada --output-format, tambahkan --output-format json
  const finalAgyArgs = [...agyArgs];
  if (hasPrintArg && !hasOutputFormat) {
    finalAgyArgs.push('--output-format', 'json');
  }

  if (!title) {
    if (promptText) {
      title = promptText.slice(0, 120);
    } else {
      title = `Tugas ${persona}`;
    }
  } else {
    title = title.slice(0, 120);
  }

  const taskId = `agy-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  // Kirim task.start
  await sendKantorEvent({
    source: 'agy',
    persona,
    type: 'task.start',
    task_id: taskId,
    title,
    level,
  });

  const agyBin = process.env.KANTOR_AGY_BIN || 'agy';

  // Tandai proses anak agar hook native tidak mencatat tugas ganda.
  process.env.KANTOR_WRAPPED = '1';
  const child = spawn(agyBin, finalAgyArgs, {
    stdio: ['inherit', 'pipe', 'inherit'],
  });

  const stdoutChunks: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => {
    stdoutChunks.push(chunk);
  });

  const exitCode = await new Promise<number>((resolve) => {
    child.on('close', (code) => {
      resolve(code ?? 0);
    });
    child.on('error', (err) => {
      process.stderr.write(`Peringatan: Gagal menjalankan agy (${agyBin}): ${err.message}\n`);
      resolve(1);
    });
  });

  const rawStdout = Buffer.concat(stdoutChunks).toString('utf8');
  let parsedJson: Record<string, unknown> | null = null;
  let usageObj: Record<string, number> | undefined = undefined;

  try {
    const trimmed = rawStdout.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      parsedJson = JSON.parse(trimmed) as Record<string, unknown>;
    }
  } catch {
    parsedJson = null;
  }

  if (parsedJson && typeof parsedJson === 'object') {
    if (parsedJson.response !== undefined) {
      const resp = String(parsedJson.response);
      process.stdout.write(resp + (resp.endsWith('\n') ? '' : '\n'));
    } else {
      process.stdout.write(rawStdout);
    }

    if (parsedJson.usage && typeof parsedJson.usage === 'object') {
      const pu = parsedJson.usage as Record<string, unknown>;
      usageObj = {};
      if (typeof pu.input_tokens === 'number') usageObj.input_tokens = pu.input_tokens;
      if (typeof pu.output_tokens === 'number') usageObj.output_tokens = pu.output_tokens;
      if (typeof pu.cache_read_tokens === 'number') usageObj.cache_read_tokens = pu.cache_read_tokens;
      if (typeof pu.cache_write_tokens === 'number') usageObj.cache_write_tokens = pu.cache_write_tokens;
      if (typeof pu.thinking_tokens === 'number') usageObj.thinking_tokens = pu.thinking_tokens;
    }
  } else {
    process.stdout.write(rawStdout);
  }

  const isSuccess =
    exitCode === 0 &&
    (!parsedJson || (parsedJson.status !== 'ERROR' && parsedJson.status !== 'error'));

  const endType = isSuccess ? 'task.end' : 'task.fail';

  const endEvent: Record<string, unknown> = {
    source: 'agy',
    persona,
    type: endType,
    task_id: taskId,
    level,
    cost_usd: null,
  };
  if (model) endEvent.model = model;
  if (usageObj) endEvent.usage = usageObj;

  await sendKantorEvent(endEvent);

  process.exit(exitCode);
}

main();
