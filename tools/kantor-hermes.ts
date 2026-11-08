import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

export type RoutingTarget = 'greg' | 'alex' | 'codex';

export interface ClassificationResult {
  target: RoutingTarget;
  reason: string;
  level: 'strategic' | 'technical' | 'creative' | 'review';
}

/**
 * Mengklasifikasikan instruksi tugas ke agen spesialis yang tepat.
 */
export function classifyIntent(prompt: string): ClassificationResult {
  const p = prompt.toLowerCase();

  // 1. Creative / Visual / Imagery / 3D Asset / Painting -> agy (alex) (Agy Artist)
  if (/(gambar|lukis|shader|visual|kreatif|art|foto|desain|easel|kanvas|atelier|aset 3d|diorama)/i.test(p)) {
    return {
      target: 'alex',
      reason: 'Tugas bernuansa visual, gambar, atau lukisan didelegasikan ke agy (Agy Artist)',
      level: 'creative',
    };
  }

  // 2. Review / Second Opinion / Text Analysis / Poetry -> codex
  if (/(second opinion|second-opinion|opini kedua|telaah|tinjauan|kritik teks|analisis teks|puisi)/i.test(p)) {
    return {
      target: 'codex',
      reason: 'Tugas review teks, telaah mendalam, atau second opinion via Codex CLI',
      level: 'review',
    };
  }

  // 3. Strategic / Planning / Macro Architecture / System Evaluation -> greg
  if (/(arsitektur|rencana|plan|evaluasi|filosofis|roadmap|strategi|spesifikasi|prd|tsd)/i.test(p)) {
    return {
      target: 'greg',
      reason: 'Tugas bernuansa perencanaan makro, arsitektur, dan evaluasi filosofis',
      level: 'strategic',
    };
  }

  // 4. Technical / Engineering / TDD / AST Refactor (Default) -> alex
  return {
    target: 'alex',
    reason: 'Tugas teknis implementasi kode, unit test, atau perbaikan bug',
    level: 'technical',
  };
}

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
      process.stderr.write(`Peringatan Hermes: Gagal kirim event (status ${res.status}): ${errText}\n`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Peringatan Hermes: Gagal kirim event: ${msg}\n`);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runHermesDispatcher(args: string[]): Promise<number> {
  let taskTitle = '';
  let dryRun = false;
  let forceTarget: RoutingTarget | null = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === '--task' || a === '-t' || a === '--prompt') && i + 1 < args.length) {
      taskTitle = args[++i];
    } else if (a.startsWith('--task=')) {
      taskTitle = a.slice('--task='.length);
    } else if (a === '--dry-run') {
      dryRun = true;
    } else if (a === '--target' && i + 1 < args.length) {
      forceTarget = args[++i] as RoutingTarget;
    } else if (!a.startsWith('-') && !taskTitle) {
      taskTitle = a;
    }
  }

  if (!taskTitle) {
    taskTitle = 'Tugas umum orkestrasi studio';
  }

  const classification = forceTarget
    ? { target: forceTarget, reason: 'Target dipaksa via argumen --target', level: 'technical' as const }
    : classifyIntent(taskTitle);

  const taskId = 'tsk-hermes-' + crypto.randomUUID().slice(0, 8);
  const dispatchTitle = `[Dispatch -> ${classification.target}] ${taskTitle}`;

  process.stdout.write(`🛰️ Hermes Orchestrator: Mengevaluasi tugas "${taskTitle}"\n`);
  process.stdout.write(`   Target   : ${classification.target.toUpperCase()}\n`);
  process.stdout.write(`   Alasan   : ${classification.reason}\n`);
  process.stdout.write(`   Kategori : ${classification.level}\n\n`);

  // Kirim event task.start orkestrasi Hermes
  await sendKantorEvent({
    source: 'hermes',
    persona: 'hermes',
    type: 'task.start',
    task_id: taskId,
    title: dispatchTitle.slice(0, 120),
    level: 'tactical',
  });

  let exitCode = 0;

  if (!dryRun) {
    // Delegasikan eksekusi subproses ke runner agen target
    let scriptPath = '';
    let runnerArgs: string[] = [];

    if (classification.target === 'codex') {
      scriptPath = process.env.FAKE_CODEX_RUNNER || path.join(PROJECT_ROOT, 'tools', 'kantor-codex.sh');
      runnerArgs = ['--title', taskTitle, '--', 'exec', '--sandbox', 'workspace-write', taskTitle];
    } else if (classification.target === 'alex') {
      scriptPath = process.env.FAKE_AGY_RUNNER || path.join(PROJECT_ROOT, 'tools', 'kantor-agy.sh');
      runnerArgs = ['--title', taskTitle, '--', taskTitle];
    } else {
      // Greg (Claude Code): dicatat sebagai antrean tugas strategis
      process.stdout.write(`   Tugas diserahkan ke antrean review strategis Claude Code (Greg).\n`);
    }

    if (scriptPath && fs.existsSync(scriptPath)) {
      try {
        exitCode = await new Promise<number>((resolve) => {
          const child = spawn(scriptPath, runnerArgs, {
            stdio: 'inherit',
          });
          child.on('close', (code) => resolve(code ?? 0));
          child.on('error', () => resolve(1));
        });
      } catch {
        exitCode = 1;
      }
    }
  }

  // Kirim event task.end orkestrasi Hermes
  await sendKantorEvent({
    source: 'hermes',
    persona: 'hermes',
    type: exitCode === 0 ? 'task.end' : 'task.fail',
    task_id: taskId,
    title: dispatchTitle.slice(0, 120),
  });

  return exitCode;
}

// Eksekusi bila dipanggil langsung via CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runHermesDispatcher(process.argv.slice(2)).then((code) => {
    process.exit(code);
  }).catch((err) => {
    process.stderr.write(`Error fatal Hermes dispatcher: ${err}\n`);
    process.exit(1);
  });
}
