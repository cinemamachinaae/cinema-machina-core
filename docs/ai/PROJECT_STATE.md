# Cinema Machina Core — Project State

## Current status
- Maintain this file after major implementation steps.
- Summarize what works, what is in progress, and what is blocked.

## Active priorities
- Build reliable, premium-grade Cinema Machina Core functionality.
- Keep project knowledge durable and queryable for Codex, Antigravity, and future handoffs.

## What works now (2026-05-19)
- Backend FastAPI boots and serves typed monitoring responses with `confirmed|inferred|unknown` confidence markers.
- Dashboard frontend exists (Next.js) and renders `/system/overview` data.
- Plex integration is real: when `PLEX_URL` + `PLEX_TOKEN` are set, the backend calls Plex `/status/sessions` and parses XML into typed `SessionState`.
- Shield ADB monitor exists and is explicitly **inferred** (derived from `adb` output); safe when unconfigured/unreachable.
- Integration “status” checks exist for Plex + Jellyfin (configured/reachable + sanitized error summaries).

## Known limitations (current phase)
- Jellyfin playback sessions are scaffold-only: credentials can mark Jellyfin “configured”, but session fetching/parsing is not implemented yet.
- Playback chain snapshot is an early foundation: display/audio/output chain nodes are present but remain intentionally `unknown` until downstream integrations exist.

## Current API surface
- `GET /health`
- `GET /system/overview`
- `GET /playback/current`
- `GET /chain/current`
- `GET /devices/shield/state`
