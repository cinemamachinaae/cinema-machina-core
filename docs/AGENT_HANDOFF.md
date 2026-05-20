# Cinema Machina Brain Portal — Agent Handoff Protocol

## Purpose
This document defines the exact artifacts and paths that AI agents (Codex, Antigravity, Claude Code, Qwen/Ollama, RuFlo, and Langflow) must read to gain immediate context on the Cinema Machina Core application and its AI Brain workspace.

## Canonical Workspace
- Active repo: `$CM_CORE_HOME` (`$HOME/Developer/cinema-machina-core`)
- Portal: `$CM_PORTAL_HOME` (`$CM_CORE_HOME/tools/brain-portal`)
- Graphify output: `$CM_GRAPHIFY_HOME` (`$CM_CORE_HOME/graphify-out`)
- Context pack: `$CM_CONTEXT_PACK`
- Handoff protocol: `$CM_AGENT_HANDOFF`

Source these paths before agent work:

```bash
source "$HOME/.config/cinema-machina/paths.sh"
cd "$CM_CORE_HOME"
```

The old iCloud checkout is backup only. Do not use it for active development, dependency installs, Graphify locks, or runtime caches.

## Context Artifacts
1. **Agent Context Pack** (`tools/brain-portal/tools/brain-ops/data/context/agent-context-pack.md`)
   - **What it is:** A highly compressed, token-efficient digest of recent workstreams, integrations, test failures, and decisions.
   - **Why to read it:** Prevents agents from wasting tokens reading large raw logs. Contains the "story" of the last few hours of development.
   
2. **Graphify Report** (`graphify-out/GRAPH_REPORT.md`)
   - **What it is:** The structural knowledge graph report of the entire application.
   - **Why to read it:** Provides the architecture overview, community detection, and god-nodes without scanning the actual source files.

## Integration Footprints
The Brain Portal checks instrumentable presence markers and daemon reachability only. It does not monitor private reasoning streams.

- `ruflo.toml` / `ruflo.config.json` -> RuFlo orchestration configured
- `.agents/` workspace -> Antigravity presence
- `claude.json` / `.claudecode` -> Claude Code presence
- `.codex/hooks.json` -> Codex workflow hooks
- `backend/langflow_adapter.py` -> Langflow integration
- `backend/ruflo_adapter.py` -> RuFlo integration

## Local Portal Launch

Run from the local SSD checkout:

```bash
cd "$CM_PORTAL_HOME"
npm ci
./start-dev.sh
```

The launcher verifies local `node_modules`, verifies `node_modules/.bin/next`, binds to `0.0.0.0:3000`, and prints local/Tailnet URLs. From the user’s iPhone over Tailscale, the expected URL is:

```text
http://100.89.153.1:3000/
```

If an agent sandbox blocks port binding, use the same command from Terminal. Builds and lint should still run from the local SSD repo.

## Handoff Workflow

When a new agent session begins, or when context feels lost:

1. Agent reads `AGENT_HANDOFF.md` (this file).
2. Agent reads `agent-context-pack.md` to establish current trajectory.
3. Agent reads `GRAPH_REPORT.md` to establish structural map.
4. Agent executes tasks.
5. Agent uses `scripts/cm-graph-refresh.sh`, `scripts/cm-agent-context-refresh.sh`, and `scripts/cm-brain-check.sh` after meaningful changes.
6. Optional background brain cycle (`run_brain_cycle.sh`) re-summarizes available activity data via Ollama into new context capsules.
