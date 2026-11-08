import test from 'node:test';
import assert from 'node:assert/strict';
import { mapHook } from '../src/hookmap.ts';

test('mapHook: pemetaan event hook Claude Code', () => {
  // 1. UserPromptSubmit
  const userPrompt = mapHook({
    hook_event_name: 'UserPromptSubmit',
    session_id: 'sess-123',
    prompt: '  buat   fitur   baru  \n  untuk sistem   ',
  });
  assert.deepEqual(userPrompt, {
    source: 'claude-hook',
    persona: 'greg',
    type: 'task.start',
    task_id: 'claude-sess-123',
    title: 'buat fitur baru untuk sistem',
  });

  // UserPromptSubmit: title dipotong 120 karakter
  const longPrompt = 'a'.repeat(200);
  const userPromptLong = mapHook({
    hook_event_name: 'UserPromptSubmit',
    session_id: 'sess-long',
    prompt: longPrompt,
  });
  assert.equal(userPromptLong?.title?.length, 120);

  // 2. Stop
  const stopEvent = mapHook({
    hook_event_name: 'Stop',
    session_id: 'sess-123',
  });
  assert.deepEqual(stopEvent, {
    source: 'claude-hook',
    persona: 'greg',
    type: 'task.end',
    task_id: 'claude-sess-123',
  });

  // 3. SubagentStart & Stop dengan persona greg (bukan betty)
  const subStartGreg = mapHook({
    hook_event_name: 'SubagentStart',
    session_id: 'sess-123',
    agent_id: 'agent-456',
    agent_type: 'researcher',
  });
  assert.deepEqual(subStartGreg, {
    source: 'claude-hook',
    persona: 'greg',
    type: 'task.start',
    task_id: 'sub-agent-456',
    title: 'Delegasi: researcher',
  });

  const subStopGreg = mapHook({
    hook_event_name: 'SubagentStop',
    session_id: 'sess-123',
    agent_id: 'agent-456',
    agent_type: 'researcher',
  });
  assert.deepEqual(subStopGreg, {
    source: 'claude-hook',
    persona: 'greg',
    type: 'task.end',
    task_id: 'sub-agent-456',
  });

  // 4. SubagentStart & Stop dengan persona betty (agent_type === 'betty')
  const subStartBetty = mapHook({
    hook_event_name: 'SubagentStart',
    session_id: 'sess-123',
    agent_id: 'agent-789',
    agent_type: 'betty',
  });
  assert.deepEqual(subStartBetty, {
    source: 'claude-hook',
    persona: 'betty',
    type: 'task.start',
    task_id: 'sub-agent-789',
    title: 'Delegasi: betty',
  });

  const subStopBetty = mapHook({
    hook_event_name: 'SubagentStop',
    session_id: 'sess-123',
    agent_id: 'agent-789',
    agent_type: 'betty',
  });
  assert.deepEqual(subStopBetty, {
    source: 'claude-hook',
    persona: 'betty',
    type: 'task.end',
    task_id: 'sub-agent-789',
  });

  // Subagent tanpa agent_id (fallback ke sub-<session_id>-<agent_type>)
  const subFallback = mapHook({
    hook_event_name: 'SubagentStart',
    session_id: 'sess-abc',
    agent_type: 'helper',
  });
  assert.equal(subFallback?.task_id, 'sub-sess-abc-helper');

  // 5. Event tak dikenal atau input null/rusak
  assert.equal(mapHook({ hook_event_name: 'UnknownEvent' }), null);
  assert.equal(mapHook(null), null);
  assert.equal(mapHook('bukan objek'), null);
});
