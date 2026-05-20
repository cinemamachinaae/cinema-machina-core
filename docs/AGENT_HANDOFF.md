# Cinema Machina Brain Portal — Agent Handoff Protocol

## Purpose
This document defines the exact artifacts and paths that AI agents (Codex, Antigravity, Claude Code) must read to gain immediate context on the state of the Cinema Machina Core application. The Brain Portal runs non-blocking telemetry ingestion, which outputs compact artifacts intended for agent consumption.

## Context Artifacts
1. **Agent Context Pack** (`tools/brain-portal/tools/brain-ops/data/context/agent-context-pack.md`)
   - **What it is:** A highly compressed, token-efficient digest of recent workstreams, integrations, test failures, and decisions.
   - **Why to read it:** Prevents agents from wasting tokens reading large raw logs. Contains the "story" of the last few hours of development.
   
2. **Graphify Report** (`graphify-out/GRAPH_REPORT.md`)
   - **What it is:** The structural knowledge graph report of the entire application.
   - **Why to read it:** Provides the architecture overview, community detection, and god-nodes without scanning the actual source files.

## Integration Footprints
The Brain Portal checks for the following presence markers to verify integration health:
- `ruflo.toml` / `ruflo.config.json` -> RuFlo orchestration configured
- `.agents/` workspace -> Antigravity presence
- `claude.json` / `.claudecode` -> Claude Code presence
- `.codex/hooks.json` -> Codex workflow hooks
- `backend/langflow_adapter.py` -> Langflow integration
- `backend/ruflo_adapter.py` -> RuFlo integration

## ⚠️ Dev Server Cannot Start Inside Agent Sessions

**Root cause (diagnosed 2026-05-20):**

Two independent problems combine to make `npm run dev` and `npm run build`
fail when launched from an AI agent:

1. **iCloud CloudDocs I/O latency (primary).** The project lives on iCloud
   Drive. `node_modules` contains a 115MB native SWC binary that iCloud may
   evict from local storage. When evicted, `dlopen()` must re-download it,
   taking 60–90 seconds. Webpack then reads thousands of source files through
   the CloudDocs daemon, causing builds to take 30+ minutes instead of 7
   seconds.

2. **Antigravity sandbox (secondary).** Antigravity wraps commands in a macOS
   `sandbox-exec` profile with `(deny default)` and **zero** `(allow network*)`
   rules. `listen()` returns `EPERM`, so even if the build completed, the dev
   server could never bind a port.

**Workaround — `start-dev.sh`:**

The startup script (`tools/brain-portal/start-dev.sh`) solves problem #1 by
automatically moving `node_modules` and `.next-local` to `~/.cache/` on the
local filesystem, then symlinking back. This must be run from a normal
Terminal session (solving problem #2).

```bash
cd tools/brain-portal
./start-dev.sh          # port 3000 by default
./start-dev.sh 3001     # alternative port
```

**What agents can and cannot do:**

- ✅ Edit source files (TypeScript, CSS, config)
- ✅ Inspect API endpoints via `curl` (if user has started the server)
- ✅ Read and modify `next.config.mjs`, `package.json`, etc.
- ❌ `npm run dev` — hangs on SWC loading, then EPERM on bind
- ❌ `npm run build` — hangs on SWC loading (30+ min)
- ❌ `npm run lint` — also uses SWC, also hangs

## Handoff Workflow

When a new agent session begins, or when context feels lost:

1. Agent reads `AGENT_HANDOFF.md` (this file).
2. Agent reads `agent-context-pack.md` to establish current trajectory.
3. Agent reads `GRAPH_REPORT.md` to establish structural map.
4. Agent executes tasks.
5. Background brain cycle (`run_brain_cycle.sh`) re-summarizes screen/activity data via Ollama into new context capsules, completing the loop.
