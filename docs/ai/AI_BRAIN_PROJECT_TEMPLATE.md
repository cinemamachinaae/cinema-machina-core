# AI Brain Project Template

Use this template to replicate the Cinema Machina AI Brain pattern in future projects without coupling them to this repo.

## Required Foundation
- `AGENTS.md` — project rules, protected files, verification policy, and agent handoff expectations.
- `SKILLS.md` — product identity, stack, coding rules, and subsystem boundaries.
- `graphify-out/` — repo-root Graphify outputs used as the first navigation map.
- `scripts/cm-brain-check.sh` — one fast pass/fail readiness check for graph files, context docs, local runtime expectations, and tool adapters.
- `scripts/cm-graph-refresh.sh` — the only normal path for refreshing Graphify and generated context artifacts.
- `scripts/cm-agent-context-refresh.sh` — compact handoff/context-pack generation for agents.

## Recommended Portal Pattern
- Keep the dashboard in a separate internal app such as `tools/brain-portal/`.
- Read repo-root Graphify outputs; do not create duplicate graph directories under the portal.
- Surface only instrumentable signals: files, CLI checks, local daemon health, git state, and generated artifacts.
- Mark unavailable optional tools as `not_configured` or `optional`, not as product failures.

## Agent Tooling
- Codex hooks: configure repo-local hooks under `.codex/` when available.
- Antigravity: preserve `.agents/` and skills/workflow files as workspace evidence.
- Claude Code: provide a concrete handoff doc and generated context pack.
- Ollama/Qwen: use for local enrichment when model and daemon are actually present.
- Langflow: report integrated only when daemon, API auth, and a project flow are validated.
- RuFlo: report integrated only when a real repo workflow validates through the installed CLI.
- Gemini: optional long-context audit helper; detect `GEMINI_API_KEY` presence only and never print secrets.

## Replication Checklist
1. Keep the active repo on local SSD, not cloud-synced storage.
2. Make GitHub or another remote the source of truth.
3. Build Graphify at repo root and commit durable graph metadata when expected.
4. Add agent handoff docs before asking agents to make broad changes.
5. Keep runtime caches, `node_modules`, `.next`, logs, and local secrets ignored.
6. Verify with lint/build/tests plus portal smoke checks before pushing.
