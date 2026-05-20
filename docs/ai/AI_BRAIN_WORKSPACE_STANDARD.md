# Cinema Machina AI Brain Workspace Standard

## Purpose
Cinema Machina Core now uses a local SSD-backed AI Brain workspace that keeps GitHub as the source of truth while exposing one consistent repo root to Codex CLI, Claude Code, Antigravity, Qwen/Ollama workflows, RuFlo, Langflow, Graphify, and future projects.

## Canonical Pattern
1. **Local SSD repo:** Active development happens in `$HOME/Developer/<project>`, not iCloud Drive.
2. **GitHub source of truth:** Clone from `origin/main`; keep the iCloud copy only as a backup until the local workspace is proven.
3. **Graphify backbone:** Keep one canonical `graphify-out/` at repo root. Run `graphify update .` after meaningful code or docs changes.
4. **Brain Ops handoff:** Maintain `docs/AGENT_HANDOFF.md` and `tools/brain-portal/tools/brain-ops/data/context/agent-context-pack.md` as compact agent entrypoints.
5. **Canonical shell paths:** Source `$HOME/.config/cinema-machina/paths.sh` before agent/tool work.
6. **Agent-first scripts:** Use `scripts/cm-graph-refresh.sh`, `scripts/cm-agent-context-refresh.sh`, and `scripts/cm-brain-check.sh` for repeatable checks.
7. **Portal control plane:** Run `tools/brain-portal/start-dev.sh` to expose the internal dashboard locally and over Tailnet.

## Required Environment
```bash
source "$HOME/.config/cinema-machina/paths.sh"
cd "$CM_CORE_HOME"
```

Expected exports:
- `CM_CORE_HOME`
- `CM_PORTAL_HOME`
- `CM_GRAPHIFY_HOME`
- `CM_CONTEXT_PACK`
- `CM_AGENT_HANDOFF`

## Agent Read Order
1. `AGENTS.md`
2. `SKILLS.md`
3. `docs/AGENT_HANDOFF.md`
4. `graphify-out/GRAPH_REPORT.md`
5. `graphify-out/AGENT_GRAPH_INDEX.md`
6. `$CM_CONTEXT_PACK`

Use Graphify queries before broad source scanning:

```bash
graphify query "how does the Brain Portal read Graphify data?"
graphify explain "tools/brain-portal/src/app/api/status/route.ts"
```

## Verification Commands
```bash
scripts/cm-graph-refresh.sh
scripts/cm-agent-context-refresh.sh
scripts/cm-brain-check.sh
cd "$CM_PORTAL_HOME" && npm run build
cd "$CM_PORTAL_HOME" && ./start-dev.sh
```

Portal endpoint checks:

```bash
curl -I http://127.0.0.1:3000/
curl -I http://127.0.0.1:3000/api/status
curl -I http://127.0.0.1:3000/api/graphify/graph
curl -I http://127.0.0.1:3000/api/enrichment/summaries
```

## Tooling Truth Rules
- Codex/Claude/Antigravity readiness means repo-level handoff files, hooks, or workspace footprints are present.
- Qwen/Ollama readiness means Ollama is on PATH, daemon is reachable, and `qwen2.5-coder:7b` is present/callable.
- RuFlo readiness means the binary and repo config are present; a global install alone is not repo integration.
- Langflow readiness means the daemon is reachable and a flow is configured when required; a global process alone is not full workflow integration.
- Never expose `.env` values, API keys, tokens, or private credentials in agent reports.

## Future Project Adaptation
For a new project, copy this pattern and adjust only the project-specific environment variable names, repo path, Graphify output path, portal path, and handoff/context artifact paths. Keep runtime caches, `node_modules`, `.next`, and Graphify locks out of cloud-synced folders.
