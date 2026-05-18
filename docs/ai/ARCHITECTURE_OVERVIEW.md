# Cinema Machina Core — Architecture Overview

## Purpose
Cinema Machina Core is the operational intelligence layer for premium home-cinema playback reliability, integration monitoring, and signal-chain visibility.

## Current product direction
The app is evolving toward a trusted control and diagnostics surface for:
- Plex and Jellyfin media-server health
- playback-session visibility
- integration status freshness
- frontend dashboard trust indicators
- future signal-chain intelligence for Shield / TV / soundbar / AVR workflows

## Architecture shape
### Backend
The backend owns:
- system overview aggregation
- media-server integration status
- session and playback-related monitoring
- health semantics and freshness timestamps
- API responses consumed by the dashboard

### Frontend
The frontend owns:
- dashboard cards
- integration freshness display
- human-readable system-state communication
- monitoring UI consistency
- resilient offline / degraded presentation states

### AI / agent routing
Agents should:
1. read `docs/ai/BRAIN_STACK.md`
2. inspect Graphify outputs before opening broad source trees
3. consult project-state and decisions docs
4. open exact files only when implementation scope is clear

## Core architecture principles
- additive API evolution where possible
- trust-first monitoring UX
- production-safe defaults
- explicit degraded states instead of silent failure
- no secrets in docs, graph artifacts, or memory files

## High-value areas for future development
- richer playback-state diagnostics
- Shield / device-path insight surfaces
- differentiating media-server, network, and HDMI/audio-path instability
- durable cross-agent project memory
- website and Core app strategic alignment
