# Cinema Machina Core — AI Toolchain Integrations

This document explains how to "actively wire" local intelligence and agent frameworks into the Cinema Machina Brain Portal.

The Brain Portal enforces a "Truth-First" model: it distinguishes between a tool simply being installed/reachable vs. having an explicit adapter that allows the Portal to orchestrate it.

## Langflow
- **Status Check**: Probes `LANGFLOW_BASE_URL` for `/health`, `/api/v1/version`, authenticated `/api/v1/flows/`, and the configured `LANGFLOW_FLOW_ENDPOINT` or `LANGFLOW_FLOW_ID`.
- **Adapter**: `backend/langflow_adapter.py`
- **Integrated Means**: The daemon is reachable, API auth is valid, and the configured flow is reachable and tied to Cinema Machina by name, endpoint, description, or tags.
- **How to Connect**: Add secrets only to ignored local env, then run `python3 backend/langflow_adapter.py`. Required variables are documented in `docs/ai/LANGFLOW_RUFLO_WIRING.md`.

## RuFlo
- **Status Check**: Checks `ruflo` on `PATH`, `.claude-flow/config.yaml`, the generated context pack, and validates `.claude-flow/workflows/cinema-machina-brain-check.json` with `ruflo workflow validate --file`.
- **Integrated Means**: The binary is detected, repo config is present, the workflow validates through the real RuFlo CLI, and the workflow points at the Cinema Machina Brain checks.
- **How to Connect**: Keep `.claude-flow/config.yaml` and `.claude-flow/workflows/cinema-machina-brain-check.json` under version control. Runtime state under `.claude-flow/data`, `.claude-flow/logs`, `.swarm`, and `ruvector.db` stays ignored.

## Codex
- **Status Check**: Checks for `.codex/hooks.json` and a `/graphify hook-check/` string inside.
- **How to Connect**: Set up Codex hooks for graphify integration.

## Claude Code
- **Status Check**: Checks for `claude.json` or `.claudecode` in the workspace root.
- **How to Connect**: Initialize Claude Code in the workspace via the CLI (`claude`). This creates the necessary configuration files.

## Antigravity
- **Status Check**: Checks for `.gemini/antigravity` or `AGENTS.md`.
- **How to Connect**: Antigravity is detected via its agent configuration files and artifacts.

## OMEGA
- **Status Check**: Checks for the `.omx` directory.
- **How to Connect**: Scaffold the `.omx` memory architecture directory as per OMEGA specifications.
