#!/usr/bin/env bash
# Run agy inside this repo and, when running as root, give every repo file back to the repo owner on exit.
# Usage: tools/agy-run.sh [agy arguments...]   e.g. tools/agy-run.sh -p "Kerjakan docs/handoff/PLAN-016-....md" --print-timeout 14m
# Root-owned files block git and later non-root agent runs (validate.sh rule V7 detects them).

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OWNER="$(stat -c '%U:%G' "$REPO_DIR")"

restore_ownership() {
  if [ "$(id -u)" -eq 0 ]; then
    # Only this repo, never a parent or another project; -h changes symlinks themselves, not their targets
    chown -Rh "$OWNER" "$REPO_DIR"
    echo "agy-run: ownership of $REPO_DIR restored to $OWNER" >&2
  fi
}
trap restore_ownership EXIT

cd "$REPO_DIR"
agy "$@"
