#!/usr/bin/env bash
# Pasang hook "kehadiran" Kantor untuk Claude Code, Codex CLI, dan agy.
# Semua hook memanggil tools/claude-hook.sh: selalu exit 0, timeout 2-3 detik,
# hanya mengirim event task.start/task.end (judul = 120 karakter pertama prompt) ke 127.0.0.1:8790.
# Jalankan sendiri: bash deploy/hooks/install.sh   (idempoten; file lama dibackup *.bak-kantor)
set -euo pipefail
H="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/tools/claude-hook.sh"
backup() { [ -f "$1" ] && cp --update=none "$1" "$1.bak-kantor" || true; }

# 1) Claude Code: gabungkan ke ~/.claude/settings.json tanpa menimpa isi lain
S="$HOME/.claude/settings.json"; backup "$S"
H="$H" S="$S" python3 - <<'PY'
import json, os
p, h = os.environ['S'], os.environ['H']
d = json.load(open(p)) if os.path.exists(p) else {}
hooks = d.setdefault('hooks', {})
for ev in ['UserPromptSubmit', 'Stop', 'SubagentStart', 'SubagentStop']:
    groups = hooks.setdefault(ev, [])
    if not any(x.get('command') == h for g in groups for x in g.get('hooks', [])):
        groups.append({'hooks': [{'type': 'command', 'command': h, 'timeout': 3}]})
with open(p, 'w') as f:
    json.dump(d, f, indent=2); f.write('\n')
print('Claude Code  :', p)
PY

# 2) agy: hook global di customization root ~/.gemini/config/
A="$HOME/.gemini/config/hooks.json"; backup "$A"
cat > "$A" <<JSON
{
  "kantor-presence": {
    "PreInvocation": [{ "type": "command", "command": "$H --agent agy --event PreInvocation", "timeout": 3 }],
    "Stop": [{ "type": "command", "command": "$H --agent agy --event Stop", "timeout": 3 }]
  }
}
JSON
echo "agy          : $A"

# 3) Codex CLI: ~/.codex/hooks.json (Codex mewajibkan trust sekali lewat TUI: /hooks)
C="$HOME/.codex/hooks.json"; backup "$C"
cat > "$C" <<JSON
{
  "hooks": {
    "UserPromptSubmit": [{ "hooks": [{ "type": "command", "command": "$H --agent codex", "timeout": 3 }] }],
    "Stop": [{ "hooks": [{ "type": "command", "command": "$H --agent codex", "timeout": 3 }] }]
  }
}
JSON
echo "Codex CLI    : $C  -> jalankan 'codex --no-daemon', ketik /hooks, trust hook kantor"
