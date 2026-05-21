# Gemini Workflow

Gemini is optional in the Cinema Machina AI Brain stack. It is useful for long-context audits and reports, but it is not required for local Brain Portal checks, Graphify refreshes, Codex work, Ollama/Qwen enrichment, Langflow, or RuFlo.

## Best Uses
- Long-context architecture audits across Graphify reports and agent handoff docs.
- Website or Vercel-oriented audits when repo context is large.
- Client signal-chain report drafting from curated, non-secret project notes.
- Second-pass review of generated docs and project templates.

## Secret Rules
- Do not commit `GEMINI_API_KEY`.
- Do not write the key into docs, scripts, command logs, or generated artifacts.
- Store secrets only in shell environment or ignored local env files.
- Brain Portal status detects key presence only and never prints the value.

## Commands

```bash
scripts/cm-gemini-audit.sh
```

The script gathers:
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/AGENT_GRAPH_INDEX.md`
- current `git status`
- recent commits

If `GEMINI_API_KEY` or the `gemini` CLI is missing, the script prints setup guidance and exits without failing the local Brain workflow.
