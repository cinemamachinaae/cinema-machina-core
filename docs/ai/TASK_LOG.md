# Cinema Machina Core — Task Log

Record major completed work, investigations, fixes, and migrations here.

## Recent work
- Initialize durable AI/project memory layer for Graphify.
- Phase 2.1 monitoring foundations:
  - Added typed dashboard endpoints (`/system/overview`, `/playback/current`, `/chain/current`, `/devices/shield/state`).
  - Implemented Plex session fetch + XML parsing + unit tests (no live Plex required).
  - Added read-only integration status probes with token/URL sanitization.
  - Added read-only Shield ADB monitor with inferred confidence semantics + tests.
