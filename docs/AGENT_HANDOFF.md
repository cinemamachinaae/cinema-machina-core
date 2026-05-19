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

## Handoff Workflow
When a new agent session begins, or when context feels lost:
1. Agent reads `AGENT_HANDOFF.md` (this file).
2. Agent reads `agent-context-pack.md` to establish current trajectory.
3. Agent reads `GRAPH_REPORT.md` to establish structural map.
4. Agent executes tasks.
5. Background brain cycle (`run_brain_cycle.sh`) re-summarizes screen/activity data via Ollama into new context capsules, completing the loop.
