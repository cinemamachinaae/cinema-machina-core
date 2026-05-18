# Cinema Machina Brain Portal

Internal local dashboard / command center for the Cinema Machina Brain stack.

Scope:
- Graphify graph intelligence (live Orb canvas + Orb HTML fallback).
- Graph freshness & integrity signals (Graphify “built from commit” vs Git `HEAD`).
- `docs/ai` completeness checks.
- Git branch/HEAD + clean/dirty worktree.
- Toolchain readiness probes (Ollama, Langflow, RuFlo) using safe read-only checks.
- Modular placeholders for future agent activity and memory feeds.

This portal is intentionally separate from the Cinema Machina Core product apps in `backend/` and `frontend/`.

## Run (local)

```bash
cd tools/brain-portal
npm install
npm run dev
```

Open:
- `http://localhost:3000` (Portal)
- `http://localhost:3000/orb` (Graphify Orb HTML served read-only via the portal)

## Build

```bash
cd tools/brain-portal
npm run build
npm run start
```

## Ollama enrichment (optional)

The portal will read these sidecars if present:
- `graphify-out/orb-community-summaries.json`
- `graphify-out/orb-node-summaries.json`

Generate them with:

```bash
cd tools/brain-portal
npm run enrich
```

Defaults:
- Model: `qwen2.5-coder:7b`
- Safe behavior: reads only `graphify-out/graph.json`, writes only the sidecar JSON files above.

## Notes

- The portal does not attempt to read Codex/Claude internal reasoning. It only surfaces instrumentable signals.
- If Graphify is stale vs `HEAD`, run `graphify update .` from the repo root.
