import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mapCodexHook, mapAgyHook } from '../src/hookmap.ts';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../tools/claude-hook.sh');

test('mapCodexHook: UserPromptSubmit -> task.start, Stop -> task.end', () => {
  assert.deepEqual(mapCodexHook({ hook_event_name: 'UserPromptSubmit', session_id: 's1', prompt: '  bangun   ruang  lobi ' }), {
    source: 'codex-hook', persona: 'codex', type: 'task.start', task_id: 'codex-s1', title: 'bangun ruang lobi',
  });
  assert.deepEqual(mapCodexHook({ hook_event_name: 'Stop', session_id: 's1' }), {
    source: 'codex-hook', persona: 'codex', type: 'task.end', task_id: 'codex-s1',
  });
  assert.equal(mapCodexHook({ hook_event_name: 'PreToolUse', session_id: 's1' }), null);
  assert.equal(mapCodexHook({ hook_event_name: 'Stop' }), null);
});

test('mapAgyHook: hanya PreInvocation pertama dan Stop fullyIdle', () => {
  const base = { conversationId: 'c1', lastUserInput: 'rapikan   tes' };
  assert.deepEqual(mapAgyHook('PreInvocation', { ...base, invocationNum: 0 }), {
    source: 'agy-hook', persona: 'alex', type: 'task.start', task_id: 'agy-c1', title: 'rapikan tes',
  });
  assert.equal(mapAgyHook('PreInvocation', { ...base, invocationNum: 3 }), null);
  assert.deepEqual(mapAgyHook('Stop', { ...base, fullyIdle: true }), {
    source: 'agy-hook', persona: 'alex', type: 'task.end', task_id: 'agy-c1',
  });
  assert.equal(mapAgyHook('Stop', { ...base, fullyIdle: false }), null);
  assert.equal(mapAgyHook('SessionStart', base), null);
  assert.equal(mapAgyHook('Stop', {}), null);
});

function runHook(args: string[], input: string, env: Record<string, string>): Promise<{ code: number | null; stdout: string }> {
  return new Promise((resolve) => {
    // KANTOR_URL ke port tertutup: hook tidak boleh gagal walau server mati.
    const child = spawn(SCRIPT, args, { env: { ...process.env, KANTOR_URL: 'http://127.0.0.1:9', ...env } });
    let stdout = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.on('close', (code) => resolve({ code, stdout }));
    child.stdin.end(input);
  });
}

test('claude-hook.sh --agent agy selalu mencetak {} dan exit 0', async () => {
  const r = await runHook(['--agent', 'agy', '--event', 'Stop'], JSON.stringify({ conversationId: 'c1', fullyIdle: true }), {});
  assert.equal(r.code, 0);
  assert.deepEqual(JSON.parse(r.stdout), {});
});

test('claude-hook.sh --agent codex dilewati saat KANTOR_WRAPPED=1', async () => {
  const r = await runHook(['--agent', 'codex'], JSON.stringify({ hook_event_name: 'Stop', session_id: 's' }), { KANTOR_WRAPPED: '1' });
  assert.equal(r.code, 0);
});
