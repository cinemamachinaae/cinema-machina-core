# Cinema Machina Core

Local-first playback-chain monitoring, diagnostic, and control platform for high-end home cinema systems.

> **Current phase: Phase 1 — Backend scaffold and `/health` endpoint only.**
> No Plex, Jellyfin, ADB, Radarr, Sonarr, FFprobe, Docker, or frontend features are present yet.

---

## Stack

| Component | Version |
|-----------|---------|
| Python | 3.11.x |
| FastAPI | 0.111.x |
| Pydantic | 2.7.x |
| Uvicorn | 0.30.x |

---

## Prerequisites

- [uv](https://docs.astral.sh/uv/) installed (`brew install uv` on macOS)
- Python 3.11 available via uv

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

## Running the Backend

**Important:** uvicorn must be launched from inside the `backend/` directory so that `app/` is on `sys.path`.

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

## Testing the Health Endpoint

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
│   │   │       └── health.py     ← GET /health
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
| 2 | Plex / Jellyfin session monitor, Now Playing API | 🔜 Planned |
| 3 | Nvidia Shield ADB monitor, remote control API | 🔜 Planned |
| 4 | Radarr / Sonarr integration, FFprobe scanner | 🔜 Planned |
| 5 | Docker deployment, client install mode | 🔜 Planned |
| 6 | PDF / export dashboard, remote diagnostics | 🔜 Planned |

---

## Notes

- This repo is hosted in iCloud Drive. Avoid running commands that generate heavy cache output in the project root.
- Do not commit `.env`. Use `.env.example` as the reference.
- Read `AGENTS.md` and `SKILLS.md` before making any code or architecture changes.
