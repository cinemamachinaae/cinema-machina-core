#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$ROOT"

fail() {
  echo "[FAIL] $*" >&2
  exit 1
}

ok() {
  echo "[OK] $*"
}

command -v graphify >/dev/null 2>&1 || fail "graphify is not on PATH"

if [ -d "tools/brain-portal/graphify-out" ]; then
  fail "duplicate tools/brain-portal/graphify-out exists; use repo-root graphify-out only"
fi

graphify update .

[ -s "graphify-out/graph.json" ] || fail "missing graphify-out/graph.json"
[ -s "graphify-out/GRAPH_REPORT.md" ] || fail "missing graphify-out/GRAPH_REPORT.md"

if [ -x "scripts/cm-agent-context-refresh.sh" ]; then
  scripts/cm-agent-context-refresh.sh
fi

ok "Graphify refreshed for $(git rev-parse --short HEAD)"
