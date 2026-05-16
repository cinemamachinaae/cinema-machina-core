# Cinema Machina Core — SKILLS.md

Version: 1.1
Owner: Rahul / Cinema Machina
Platform: iMac 27-inch Intel 2020

---

## 1 — Project Identity

Cinema Machina Core is a local-first playback-chain monitoring, diagnostic, and control platform for high-end home cinema systems.

It is not:
- Plex replacement
- Jellyfin replacement
- Kodi replacement

It is:
- playback intelligence layer
- diagnostics/control plane
- compatibility engine
- media-chain verification system
- Cinema Machina client support tool

Primary goal:

```txt
Is this media playing in the best possible quality?
```

---

## 2 — Core Principle

Never guess playback quality.

Playback analysis must separate:

```txt
1. source file capability
2. media server decision
3. client playback state
4. device/output state
```

All playback states must include:

```txt
confirmed | inferred | unknown
```

Example:

```json
{
  "audio_format": "Dolby TrueHD Atmos",
  "confidence": "inferred",
  "source": "ADB dumpsys audio"
}
```

---

## 3 — System Philosophy

Cinema Machina Core must be modular.

Every integration must be isolated:

```txt
Plex
Jellyfin
Kodi
Nvidia Shield ADB
Radarr
Sonarr
Bazarr
Trailarr
Kometa
FFprobe
frontend state
```

If a subsystem fails:
- return partial state
- never crash the dashboard
- expose clear health warnings

---

## 4 — Device Compatibility Tiers

Tier 1:
- Nvidia Shield
- Android TV
- Google TV
- Fire TV

Tier 2:
- Plex
- Jellyfin
- Kodi JSON-RPC

Tier 3:
- Samsung Tizen TVs
- LG webOS TVs

Tier 4:
- Zidoo
- Dune HD
- Apple TV

---

## 5 — Core MVP Features

- Plex playback monitoring
- Jellyfin playback monitoring
- Direct Play / Direct Stream / Transcode analysis
- bitrate analysis
- video codec detection
- audio codec detection
- HDR detection
- Dolby Vision profile analysis
- subtitle burn-risk detection
- Nvidia Shield remote control
- playback-chain visualization
- Radarr/Sonarr library health
- FFprobe compatibility scanner
- client deployment mode

---

## 6 — Technology Stack

Backend:
- Python
- FastAPI
- Pydantic v2
- Redis
- SQLite first, PostgreSQL later
- FFprobe
- MediaInfo
- ADB

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- PWA-ready dashboard

Deployment:
- Docker Compose
- local-first deployment
- Tailscale optional

AI workflow:
- Claude Code
- Codex CLI / Codex VS Code extension
- Cursor
- Gemini CLI
- ChatGPT

---

## 6A — Pinned Versions

Pinned MVP versions:
- Python 3.11.x
- FastAPI 0.111.x
- Pydantic 2.7.x
- Next.js 14.x
- Node 20 LTS
- Redis 7.x
- Docker Compose v2

Agents must not upgrade major versions unless explicitly requested.

---

## 7 — Coding Standards

Python:
- typed everywhere
- Pydantic models
- Google-style docstrings
- no business logic in routes
- async where appropriate
- clear error models

Frontend:
- TypeScript strict mode
- reusable components
- modular state
- no hardcoded backend URLs
- no inline spaghetti logic

General:
- never hardcode secrets
- always use .env
- graceful error handling mandatory
- preserve backward compatibility
- prefer small focused modules

---

## 8 — Expected Folder Structure

```txt
cinema-machina-core/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── config/
│   │   ├── devices/
│   │   ├── integrations/
│   │   ├── media_probe/
│   │   ├── models/
│   │   ├── services/
│   │   └── main.py
│   └── tests/
├── frontend/
├── docs/
├── docker-compose.yml
├── .env.example
├── AGENTS.md
├── SKILLS.md
└── README.md
```

Routes, services, integrations, and devices must remain separated.

---

## 9 — Known Home Environment

```txt
iMac 27-inch Intel 2020
active network interface: en1
subnet: 192.168.1.x
storage: /Volumes/FLIX
Nvidia Shield with network debugging enabled
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
`/Volumes/FLIX` may be near capacity. Check disk space before any scan.

---

## 10 — Playback Chain Model

Canonical model:

```json
{
  "source_file": {
    "codec": "HEVC",
    "audio": "TrueHD Atmos",
    "hdr": "Dolby Vision",
    "confidence": "confirmed"
  },
  "media_server": {
    "decision": "Direct Play",
    "confidence": "confirmed"
  },
  "client": {
    "device": "Nvidia Shield",
    "app": "Plex",
    "confidence": "confirmed"
  },
  "output_state": {
    "audio": "TrueHD Atmos",
    "video": "Dolby Vision",
    "confidence": "inferred"
  }
}
```

---

## 11 — FFprobe Rules

FFprobe is authoritative for:
- container
- codecs
- bitrate
- subtitle formats
- basic HDR metadata
- duration
- resolution

FFprobe is not always authoritative for:
- Dolby Vision FEL/MEL
- real playback compatibility
- actual device passthrough
- AVR/soundbar decode state

Uncertain parsing must be marked as inferred.

---

## 12 — Plex Rules

Plex can report:
- Direct Play
- Direct Stream
- Transcoding
- client
- session
- bitrate
- transcode reason

Plex reporting alone is not proof of:
- AVR passthrough
- Atmos decode
- DTS:X decode
- soundbar final state

Subtitle burn-in can trigger transcoding unexpectedly.

---

## 13 — ADB Rules

ADB output is inferred state.

Never treat `dumpsys audio` or `dumpsys SurfaceFlinger` as confirmed final output.

ADB commands must:
- use try/except
- fail gracefully
- handle offline devices
- handle sleep/wake disconnects
- support reconnect

Assume:
- Android firmware differences
- app-specific restrictions
- hidden codec paths
- incomplete media session metadata

---

## 14 — Docker Rules

Containers must:
- use healthchecks
- restart unless-stopped
- avoid privileged mode unless necessary
- load config from .env

Media mounts should be read-only whenever possible.

Never write to client media libraries unless explicitly requested.

---

## 15 — API Rules

Every API route must:
- return typed responses
- expose clean errors
- avoid silent failures
- avoid breaking schema changes

WebSocket payloads must be version-safe.

---

## 16 — Testing Rules

All integrations require:
- mock fixtures
- offline failure testing
- timeout handling
- invalid API key testing
- missing file testing
- malformed metadata testing
- disconnected Shield testing

---

## 17 — Logging Rules

Use structured logs.

Log:
- device disconnects
- transcoding events
- API failures
- compatibility warnings
- scan failures

Never log:
- API keys
- secrets
- tokens
- client private credentials

---

## 18 — AI Agent Workflow

Before editing, agents must:
1. read SKILLS.md
2. read AGENTS.md
3. summarize affected files
4. explain intended changes
5. list possible side effects
6. make minimal edits
7. run or provide test commands

Agents must avoid:
- broad refactors
- rewriting working modules
- changing protected files silently
- hardcoding secrets
- dependency upgrades without permission

---

## 18A — Recommended AI Tool Roles

Claude Code:
- architecture
- deep refactors
- complex debugging
- playback-chain reasoning

Codex CLI / Codex VS Code:
- implementation
- repo-wide edits
- terminal automation
- test execution
- repo review

Cursor:
- frontend/backend IDE pair programming
- rapid component iteration
- inline code editing

Gemini CLI:
- secondary terminal agent
- supplementary debugging
- API/documentation lookups

ChatGPT:
- planning
- architecture validation
- workflow design
- documentation generation
- review

Codex CLI and Codex VS Code extension are the same ecosystem.

---

## 19 — AI Handoff Prompt

Use this when onboarding a new agent:

```txt
Read SKILLS.md first, then AGENTS.md.

Before editing, summarize:
- files affected
- intended changes
- possible side effects

Never edit protected infrastructure files without permission.

Preserve:
- modular structure
- playback confidence model
- backward API compatibility

Do not guess playback quality.
All playback states must be marked confirmed, inferred, or unknown.
```

---

## 20 — Client Deployment Philosophy

Cinema Machina clients should receive:
- branded dashboard
- local deployment
- remote diagnostics
- playback-chain visibility
- library health reports
- premium signal-chain audit

The platform must work locally first without cloud dependency.

---

## 21 — Security Rules

Never:
- expose API keys
- expose tokens
- commit .env
- publish client IPs
- log secrets

All credentials must come from environment variables.

---

## 22 — Performance Rules

Avoid:
- blocking scans
- full-library rescans on every refresh
- synchronous FFprobe batches
- unbounded polling
- large memory snapshots

Prefer:
- Redis caching
- incremental updates
- async polling
- background scan jobs
- rate limits

---

## 23 — Build Priority Order

Phase 1:
- project scaffold
- FastAPI boot
- /health endpoint
- Git initialized

Phase 2:
- Plex/Jellyfin monitoring
- Now Playing API

Phase 3:
- Nvidia Shield ADB state
- remote control API

Phase 4:
- FFprobe scanner
- Radarr/Sonarr library health
- compatibility engine

Phase 5:
- Docker deployment
- client deployment mode
- Tailscale support workflow

Phase 6:
- PDF health reports
- client diagnostics
- Cinema Machina branded export

---

## 24 — Done Definition

A feature is not complete unless it is:
- typed
- documented
- tested or testable
- failure-safe
- modular
- API-safe
- Docker-aware
- agent-readable

---

## 25 — Documentation Rules

Every major subsystem requires:
- architecture notes
- API examples
- failure modes
- deployment notes
- test commands

Docs must remain:
- concise
- implementation-focused
- current

---

## 26 — Repository Health Rules

Agents must preserve:
- folder structure
- module boundaries
- API contracts
- confidence model
- protected files

Avoid:
- dead files
- duplicate integrations
- giant modules
- unclear names
- magic constants

---

## 27 — Device-Specific Rules

Nvidia Shield:
- ADB TCP port 5555
- network debugging enabled
- ADB state inferred

Samsung Q990B/Q990C:
- final audio decode cannot be assumed from Shield alone

Xiaomi TV S:
- Android TV behavior varies by firmware

Zidoo / Dune:
- support later through device-specific APIs or polling
- do not assume Android TV behavior

Apple TV:
- limited diagnostics
- profile through Plex/Jellyfin session data and client profile

---

## 28 — Deployment Goals

Long-term deployment targets:
- local Docker deployment
- NAS deployment
- mini-PC deployment
- Mac deployment
- Tailscale remote support
- Cinema Machina branded installs

---

## 29 — Files Agents Must Not Edit Without Permission

Protected infrastructure files:
- AGENTS.md
- SKILLS.md
- .env
- .env.example
- docker-compose.yml
- docs/ARCHITECTURE.md

Agents must:
1. explain why changes are needed
2. list expected side effects
3. wait for confirmation

before editing these files.

---

## 30 — Known Pitfalls

Network:
- en0 inactive on iMac
- active interface is en1
- DHCP may change device IPs
- Tailscale may alter routes

Storage:
- /Volumes/FLIX near capacity
- large scans can spike HDD usage

ADB:
- dumpsys output varies across Android versions
- ADB may disconnect after sleep/wake
- some apps hide codec metadata

Plex:
- Plex webhooks require Plex Pass
- subtitle burn-in may trigger transcoding
- Plex Direct Play is not proof of AVR decode

Radarr/Sonarr:
- mediaInfo may be empty before import completion
- host paths may differ from Docker paths

FFprobe:
- Dolby Vision parsing is inconsistent across ffmpeg builds
- FEL/MEL detection may require custom parsing
- MKVs may expose incomplete side_data_list

Docker:
- macOS Docker networking differs from Linux
- ADB passthrough into containers may need special handling
- volume mount paths vary by deployment

AI workflow:
- never assume playback state without evidence
- never refactor entire modules unless requested
- always preserve backward compatibility
- always summarize intended edits first

---

## 31 — Final Principle

Prioritize:
- reliability
- playback integrity
- modularity
- diagnosability
- maintainability
- agent-readability

Never optimize for cleverness over clarity.
