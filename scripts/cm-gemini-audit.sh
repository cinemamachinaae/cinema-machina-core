#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
cd "$ROOT"

echo "Cinema Machina Gemini Audit"
echo "Root: $ROOT"

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "[INFO] GEMINI_API_KEY is not set. Gemini is optional."
  echo "[INFO] Add it to your shell or ignored local env only; never commit secrets."
  echo "[INFO] Inputs prepared for audit:"
  echo "  - graphify-out/GRAPH_REPORT.md"
  echo "  - graphify-out/AGENT_GRAPH_INDEX.md"
  echo "  - git status"
  echo "  - recent commits"
  exit 0
fi

echo "[OK] GEMINI_API_KEY is present (value hidden)."

if ! command -v gemini >/dev/null 2>&1; then
  echo "[INFO] gemini CLI is not installed or not on PATH."
  echo "[INFO] Install/configure the CLI, then rerun this script for a long-context audit."
  exit 0
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

{
  echo "# Cinema Machina Gemini Audit Context"
  echo
  echo "## Git Status"
  git status --short
  echo
  echo "## Recent Commits"
  git log --oneline -n 8
  echo
  echo "## Graph Report"
  sed -n '1,220p' graphify-out/GRAPH_REPORT.md
  echo
  echo "## Agent Graph Index"
  sed -n '1,220p' graphify-out/AGENT_GRAPH_INDEX.md
} > "$tmp"

gemini <<EOF
You are auditing the Cinema Machina AI Brain workspace. Use the provided context only.
Return a concise production-readiness report with:
1. Current strengths
2. Weak or stale areas
3. Exact next actions
4. Any Graphify or agent-readiness risks

$(cat "$tmp")
EOF
