# Cinema Machina Core — AGENTS.md

Version: 1.0
Owner: Rahul / Cinema Machina
Project: Cinema Machina Core

---

## 1 — Required Reading

Before making any code, architecture, documentation, or deployment change:

1. Read `SKILLS.md`
2. Read this `AGENTS.md`
3. Summarize:
   - files affected
   - intended changes
   - possible side effects

Do not begin implementation until the plan is clear.

---

## 2 — Product Definition

Cinema Machina Core is a local-first playback-chain monitoring, diagnostic, and control platform for high-end home cinema systems.

It is not a Plex, Jellyfin, or Kodi replacement.

It is a control plane that verifies and visualizes the chain:

```txt
Source File
→ Media Server
→ Network
→ Playback Client
→ Display
→ Audio System
```

Primary question:

```txt
Is this media playing in the best possible quality?
```

---

## 3 — Core Rule

Never guess playback quality.

Every playback state must be marked as:

```txt
confirmed | inferred | unknown
```

---

## 4 — Protected Files

Do not edit these files without explicit permission:

```txt
AGENTS.md
SKILLS.md
.env
.env.example
docker-compose.yml
docs/ARCHITECTURE.md
```

To edit them, first state:

1. why the edit is needed
2. expected side effects
3. exact files to change

Then wait for confirmation.

---

## 5 — Current Known Environment

```txt
iMac 27-inch Intel 2020
Active network interface: en1
Subnet: 192.168.1.x
Storage: /Volumes/FLIX
Nvidia Shield: ADB network debugging enabled
Samsung Q990B/Q990C soundbar
Xiaomi TV S
Plex
Jellyfin
Radarr
Sonarr
Prowlarr
Bazarr
Trailarr
Kometa
qBittorrent
Tailscale
```

Important:

```txt
/Volumes/FLIX may be near capacity.
Check available disk space before scanning.
```

---

## 6 — Build Priority

Phase 1:

```txt
FastAPI backend scaffold
/health endpoint
clean project structure
no Plex/Jellyfin/ADB yet
```

Phase 2:

```txt
Plex/Jellyfin session monitor
Now Playing API
```

Phase 3:

```txt
Nvidia Shield ADB monitor
remote control API
```

Phase 4:

```txt
Radarr/Sonarr integration
FFprobe scanner
library health
```

Phase 5:

```txt
Docker deployment
client install mode
```

Phase 6:

```txt
Cinema Machina client health report
PDF/export dashboard
remote diagnostics
```

---

## 7 — Stack

Pinned MVP versions:

```txt
Python 3.11.x
FastAPI 0.111.x
Pydantic 2.7.x
Next.js 14.x
Node 20 LTS
Redis 7.x
Docker Compose v2
```

Do not upgrade major versions unless explicitly requested.

---

## 8 — Coding Rules

Python:
- typed everywhere
- Pydantic models
- Google-style docstrings
- business logic outside route handlers
- graceful failure for all devices

Frontend:
- Next.js
- TypeScript
- modular components
- no hardcoded API URLs

General:
- no hardcoded secrets
- use .env
- preserve API compatibility
- small focused modules
- no broad refactors without permission

---

## 9 — ADB Rule

ADB output is inferred.

Never treat Nvidia Shield `dumpsys` output as confirmed AVR/soundbar decode.

Confirmed audio output requires downstream device evidence or user-visible AVR/soundbar state.

---

## 10 — Agent Workflow

Before editing:

```txt
1. Read SKILLS.md
2. Read AGENTS.md
3. Summarize intended file changes
4. Make minimal edits
5. Run tests or provide exact test command
6. Report result clearly
```

Do not rewrite working modules unless specifically requested.

---

## 11 — Done Definition

A feature is done only when it is:

```txt
typed
documented
tested or testable
failure-safe
modular
API-safe
Docker-aware
agent-readable
```

---

## 12 — First Milestone

The first acceptable milestone is:

```txt
backend boots locally
GET /health returns OK
project structure exists
Git initialized
SKILLS.md and AGENTS.md committed
no feature code yet
```

---

## 13 — Agent Commit / Push Policy

For normal non-protected feature work, agents are authorised to:

1. Inspect the repo
2. Plan changes
3. Edit code
4. Run tests
5. Commit with a conventional commit message
6. Push to origin/main
7. Report the commit hash and test result

Agents must stop and ask before committing/pushing when:

- Tests fail
- Push fails or a merge conflict occurs
- Protected files need editing
- Secrets or .env are involved
- A destructive or broad refactor is required

Protected files always require explicit confirmation before editing:

```txt
AGENTS.md
SKILLS.md
.env
.env.example
docker-compose.yml
docs/ARCHITECTURE.md
```
