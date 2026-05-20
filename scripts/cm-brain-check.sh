#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$ROOT"

FAILURES=0

pass() {
  echo "[PASS] $*"
}

warn() {
  echo "[WARN] $*"
}

fail() {
  echo "[FAIL] $*"
  FAILURES=$((FAILURES + 1))
}

check_file() {
  local file="$1"
  [ -s "$file" ] && pass "$file" || fail "missing or empty $file"
}

echo "Cinema Machina Brain Check"
echo "Root: $ROOT"
echo "HEAD: $(git rev-parse --short HEAD)"

if [ "${CM_CORE_HOME:-}" = "$ROOT" ]; then
  pass "CM_CORE_HOME points at repo root"
elif [ -n "${CM_CORE_HOME:-}" ]; then
  warn "CM_CORE_HOME points elsewhere: $CM_CORE_HOME"
else
  warn "CM_CORE_HOME is not set; source ~/.config/cinema-machina/paths.sh"
fi

command -v graphify >/dev/null 2>&1 && pass "graphify is on PATH" || fail "graphify is not on PATH"

check_file "graphify-out/graph.json"
check_file "graphify-out/GRAPH_REPORT.md"
check_file "graphify-out/AGENT_GRAPH_INDEX.md"
check_file "graphify-out/cluster-map.json"
check_file "graphify-out/agent-query-cheatsheet.md"
check_file "docs/AGENT_HANDOFF.md"
check_file "tools/brain-portal/tools/brain-ops/data/context/agent-context-pack.md"

if [ -d "tools/brain-portal/graphify-out" ]; then
  fail "duplicate tools/brain-portal/graphify-out exists"
else
  pass "single canonical graphify-out directory"
fi

if [ -d "tools/brain-portal/node_modules" ] && [ ! -L "tools/brain-portal/node_modules" ]; then
  pass "Brain Portal node_modules is local"
else
  fail "Brain Portal node_modules missing or symlinked"
fi

if [ -x "tools/brain-portal/node_modules/.bin/next" ]; then
  pass "Brain Portal Next.js binary present"
else
  fail "Brain Portal Next.js binary missing"
fi

if [ -f "backend/langflow_adapter.py" ]; then
  python3 backend/langflow_adapter.py | python3 -c 'import json,sys; data=json.load(sys.stdin); print("[INFO] Langflow:", data.get("detail", data))' || warn "Langflow adapter probe failed"
else
  warn "Langflow adapter missing"
fi

if [ -f "backend/ruflo_adapter.py" ]; then
  python3 backend/ruflo_adapter.py | python3 -c 'import json,sys; data=json.load(sys.stdin); print("[INFO] RuFlo:", data.get("detail", data))' || warn "RuFlo adapter probe failed"
else
  warn "RuFlo adapter missing"
fi

if [ "${CM_PORTAL_CHECK_HTTP:-0}" = "1" ]; then
  for url in \
    "http://127.0.0.1:3000/" \
    "http://127.0.0.1:3000/api/status" \
    "http://127.0.0.1:3000/api/graphify/graph" \
    "http://127.0.0.1:3000/api/enrichment/summaries"; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' "$url" || true)"
    [ "$code" = "200" ] && pass "$url returned 200" || fail "$url returned $code"
  done
fi

if [ "$FAILURES" -gt 0 ]; then
  echo "[FAIL] $FAILURES brain check(s) failed"
  exit 1
fi

pass "brain check complete"
