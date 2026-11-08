import type { KantorEvent } from './events.ts';

export interface ClaudeHookInput {
  hook_event_name?: string;
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  prompt?: string;
  agent_id?: string;
  agent_type?: string;
  [key: string]: unknown;
}

export function mapHook(input: unknown): KantorEvent | null {
  if (typeof input !== 'object' || input === null) {
    return null;
  }

  const raw = input as ClaudeHookInput;
  const eventName = typeof raw.hook_event_name === 'string' ? raw.hook_event_name : '';
  const sessionId = typeof raw.session_id === 'string' ? raw.session_id : '';
  const agentId = typeof raw.agent_id === 'string' ? raw.agent_id.trim() : '';
  const agentType = typeof raw.agent_type === 'string' ? raw.agent_type.trim() : '';

  if (eventName === 'UserPromptSubmit') {
    let title: string | undefined = undefined;
    if (typeof raw.prompt === 'string') {
      const compacted = raw.prompt.trim().replace(/\s+/g, ' ');
      title = compacted.slice(0, 120);
    }

    return {
      source: 'claude-hook',
      persona: 'greg',
      type: 'task.start',
      task_id: `claude-${sessionId}`,
      ...(title !== undefined ? { title } : {}),
    };
  }

  if (eventName === 'Stop') {
    return {
      source: 'claude-hook',
      persona: 'greg',
      type: 'task.end',
      task_id: `claude-${sessionId}`,
    };
  }

  if (eventName === 'SubagentStart') {
    const persona = agentType === 'betty' ? 'betty' : 'greg';
    const taskId = agentId ? `sub-${agentId}` : `sub-${sessionId}-${agentType}`;
    const title = agentType ? `Delegasi: ${agentType}`.slice(0, 120) : 'Delegasi';

    return {
      source: 'claude-hook',
      persona,
      type: 'task.start',
      task_id: taskId,
      title,
    };
  }

  if (eventName === 'SubagentStop') {
    const persona = agentType === 'betty' ? 'betty' : 'greg';
    const taskId = agentId ? `sub-${agentId}` : `sub-${sessionId}-${agentType}`;

    return {
      source: 'claude-hook',
      persona,
      type: 'task.end',
      task_id: taskId,
    };
  }

  return null;
}
