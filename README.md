# Cinema Machina Core

Local-first playback-chain monitoring, diagnostic, and control platform for high-end home cinema systems.

> **Current phase: Phase 2.1 — Foundations for “Now Playing” + dashboard monitoring.**
> This repo is still early-stage: Plex session parsing is real, but many downstream signals remain intentionally `unknown`.

---

## Stack

| Component | Version |
|-----------|---------|
| Python | 3.11.x |
| FastAPI | 0.111.x |
| Pydantic | 2.7.x |
| Uvicorn | 0.30.x |
| Next.js | 14.x |

---

## Prerequisites

- [uv](https://docs.astral.sh/uv/) installed (`brew install uv` on macOS)
- Python 3.11 available via uv
- Node 20 LTS (frontend)

---

## Setup

### 1. Create the virtual environment

Run from the project root:

```bash
uv venv .venv --python 3.11
```

### 2. Install dependencies

```bash
uv pip install -r backend/requirements.txt
```

---

## Running the Backend API

**Important:** `uvicorn` must be launched from inside the `backend/` directory so that `app/` is on `sys.path`.

```bash
cd backend
../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
```

To enable auto-reload during development:

```bash
cd backend
../.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## Running the Frontend Dashboard

```bash
cd frontend
npm install
npm run dev
```

The dashboard expects the backend on port `8000` by default. Override with:
- `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://127.0.0.1:8000`)

---

## API Endpoints (Phase 2.1)

Backend endpoints currently exposed:
- `GET /health`
- `GET /system/overview`
- `GET /playback/current`
- `GET /chain/current`
- `GET /devices/shield/state`

### Notes on maturity / trust model
- Plex integration is real: the backend calls Plex `GET /status/sessions` when `PLEX_URL` and `PLEX_TOKEN` are configured.
- Shield ADB monitoring is **inferred** (derived from `adb` outputs); it is never treated as confirmed downstream device decode state.
- Jellyfin “status” exists (configured/reachable checks), but Jellyfin session playback fetching/parsing is currently a scaffold (placeholder).

---

## Quick Smoke Check

With the backend running, open a second terminal and run:

```bash
curl -s http://127.0.0.1:8000/health | python3 -m json.tool
```

### Expected Response

```json
{
    "status": "ok",
    "service": "cinema-machina-core",
    "confidence": "confirmed"
}
```

The `confidence` field follows the Cinema Machina playback-state model:
all states are marked `confirmed`, `inferred`, or `unknown`.

---

## Project Structure

```
cinema-machina-core/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── health.py     ← GET /health
│   │   │       ├── playback.py   ← GET /playback/current
│   │   │       ├── chain.py      ← GET /chain/current
│   │   │       ├── devices.py    ← GET /devices/shield/state
│   │   │       └── system.py     ← GET /system/overview
│   │   └── main.py               ← FastAPI app entry point
│   ├── tests/
│   └── requirements.txt
├── docs/
│   └── ARCHITECTURE.md
├── .env.example
├── .gitignore
├── AGENTS.md
├── SKILLS.md
└── README.md
```

---

## API Reference

### `GET /health`

Returns the service health status.

**Response `200 OK`:**

```json
{
    "status": "ok",
    "service": "cinema-machina-core",
    "confidence": "confirmed"
}
```

---

## Phase Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Backend scaffold, `/health` endpoint, Git init | ✅ Complete |
| 2.1 | Playback/session foundations + dashboard endpoints | ✅ In progress |
| 2.2 | Jellyfin session parsing parity with Plex | 🔜 Planned |
| 3 | Nvidia Shield ADB monitor, remote control API | 🟡 Partial (read-only monitoring only) |
| 4 | Radarr / Sonarr integration, FFprobe scanner | 🔜 Planned |
| 5 | Docker deployment, client install mode | 🔜 Planned |
| 6 | PDF / export dashboard, remote diagnostics | 🔜 Planned |

---

## Notes

- Active development now runs from the local SSD workspace at `$CM_CORE_HOME` (`$HOME/Developer/cinema-machina-core`). Keep the old iCloud checkout as backup only.
- Use `~/.config/cinema-machina/paths.sh` for canonical local paths and run Graphify from the repo root.
- Do not commit `.env`. Use `.env.example` as the reference.
- Read `AGENTS.md` and `SKILLS.md` before making any code or architecture changes.
