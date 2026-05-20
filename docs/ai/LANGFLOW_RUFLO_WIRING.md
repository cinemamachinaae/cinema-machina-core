# Langflow and RuFlo Wiring

## Truth Rules
- `Integrated` means a real daemon, API, or config check passed.
- `Configured` means repo-level configuration exists and the tool can validate it, but no live workflow was executed.
- `Detected` means the binary or daemon exists but the repo is not wired.
- Do not store API keys, tokens, passwords, or `.env` values in committed files.

## Langflow
Current evidence:
- Langflow `1.9.2` is reachable at `http://127.0.0.1:7860`.
- Authenticated API routes return `403` without credentials.
- The local database contains starter/example flows, but no verified `Cinema Machina Brain Orchestration` flow.

The adapter reads ignored local env files (`.env.local`, then `.env`) and supports:

```bash
LANGFLOW_BASE_URL=http://127.0.0.1:7860
LANGFLOW_API_KEY=<local Langflow API key>
LANGFLOW_FLOW_ENDPOINT=cinema-machina-brain-orchestration
LANGFLOW_FLOW_ID=<optional flow UUID>
```

Minimal human action if no API key or flow is configured:
1. Open Langflow at `http://127.0.0.1:7860`.
2. Create or identify a flow named `Cinema Machina Brain Orchestration`.
3. Set its endpoint name to `cinema-machina-brain-orchestration` if the UI supports endpoint aliases.
4. Create a Langflow API key.
5. Put the values in the ignored local `.env.local` file using the variables above.
6. Verify with `python3 backend/langflow_adapter.py`.

The Brain Portal reports Langflow as integrated only when the daemon is reachable, API auth is valid, and the configured/discovered flow is tied to Cinema Machina by name, endpoint, tags, or description.

## RuFlo
Current evidence:
- `ruflo` is installed at `/opt/homebrew/bin/ruflo`.
- `ruflo --version` reports `ruflo v3.7.0-alpha.40`.
- `ruflo init` creates an official `.claude-flow/config.yaml` repo config.
- `ruflo status` validates the repo config.
- `ruflo workflow validate --file .claude-flow/workflows/cinema-machina-brain-check.json` validates the committed Cinema Machina Brain workflow.

Committed repo-level config:
- `.claude-flow/config.yaml`
- `.claude-flow/.gitignore`
- `.claude-flow/workflows/cinema-machina-brain-check.json`

Runtime artifacts remain ignored:
- `.swarm/`
- `.claude/`
- `ruvector.db`
- root `CLAUDE.md`
- `.claude-flow/workflows/store.json`

Verify with:

```bash
ruflo --version
ruflo status
ruflo workflow validate --file .claude-flow/workflows/cinema-machina-brain-check.json
python3 backend/ruflo_adapter.py
```

The Brain Portal reports RuFlo as `Integrated` only when the binary is detected, `.claude-flow/config.yaml` exists, the context pack exists, and the committed workflow validates through the real RuFlo CLI while pointing at the Brain context/check scripts.
