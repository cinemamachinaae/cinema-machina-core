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

PACK_BUILDER="tools/brain-portal/tools/brain-ops/build_agent_pack.py"
CONTEXT_PACK="tools/brain-portal/tools/brain-ops/data/context/agent-context-pack.md"

[ -f "$PACK_BUILDER" ] || fail "missing $PACK_BUILDER"
[ -d "graphify-out" ] || fail "missing graphify-out"

python3 "$PACK_BUILDER"

[ -s "$CONTEXT_PACK" ] || fail "context pack was not written"
[ -s "docs/AGENT_HANDOFF.md" ] || fail "missing docs/AGENT_HANDOFF.md"
[ -s "graphify-out/AGENT_GRAPH_INDEX.md" ] || fail "missing graphify-out/AGENT_GRAPH_INDEX.md"
[ -s "graphify-out/agent-query-cheatsheet.md" ] || fail "missing graphify-out/agent-query-cheatsheet.md"
[ -s "graphify-out/cluster-map.json" ] || fail "missing graphify-out/cluster-map.json"

ok "agent context artifacts are present"
ok "context pack refreshed at $CONTEXT_PACK"
