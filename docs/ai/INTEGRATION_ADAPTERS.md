# Cinema Machina Core — AI Toolchain Integrations

This document explains how to "actively wire" local intelligence and agent frameworks into the Cinema Machina Brain Portal.

The Brain Portal enforces a "Truth-First" model: it distinguishes between a tool simply being installed/reachable vs. having an explicit adapter that allows the Portal to orchestrate it.

## Langflow
- **Status Check**: Probes `http://127.0.0.1:7860/health` (or `/api/v1/version`).
- **Adapter**: `backend/langflow_adapter.py`
- **How to Connect**: Create the `langflow_adapter.py` script. It should wrap the Langflow API and expose standard methods (e.g., `trigger_pipeline()`, `get_status()`). Once this file exists, the Portal will detect it and mark Langflow as "Integrated".

## RuFlo
- **Status Check**: Checks for `ruflo.toml` or `ruflo.config.json` in the workspace root.
- **How to Connect**: Initialize RuFlo in the workspace. The presence of the configuration file will mark RuFlo as integrated.

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
