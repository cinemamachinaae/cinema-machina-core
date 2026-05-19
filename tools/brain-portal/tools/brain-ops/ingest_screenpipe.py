from __future__ import annotations

import os
import sys
import json
from pathlib import Path
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

BASE = Path(__file__).parent
load_dotenv(BASE / ".env")

SCREENPIPE_BASE_URL = os.getenv("SCREENPIPE_BASE_URL", "http://127.0.0.1:3030")
SCREENPIPE_API_KEY = os.getenv("SCREENPIPE_API_KEY", "")
MAX_RESULTS = int(os.getenv("MAX_SCREENPIPE_RESULTS", "40"))

RAW_DIR = BASE / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)


def headers() -> dict[str, str]:
    if SCREENPIPE_API_KEY:
        return {"Authorization": f"Bearer {SCREENPIPE_API_KEY}"}
    return {}


def fetch_recent_screenpipe() -> dict:
    try:
        health = requests.get(f"{SCREENPIPE_BASE_URL}/health", timeout=5)
        health.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"[WARN] Screenpipe health check failed: {e}")
        return {"status": "unavailable", "error": str(e)}

    params = {
        "limit": MAX_RESULTS,
        "content_type": "all",
    }

    try:
        response = requests.get(
            f"{SCREENPIPE_BASE_URL}/search",
            headers=headers(),
            params=params,
            timeout=30,
        )
        if response.status_code == 403:
            print("[WARN] Screenpipe search returned 403 Forbidden. Auth required or restricted.")
            return {"status": "forbidden", "error": "403 Forbidden"}
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"[WARN] Screenpipe search failed: {e}")
        return {"status": "error", "error": str(e)}


def main() -> None:
    payload = fetch_recent_screenpipe()

    out = RAW_DIR / f"screenpipe-recent-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.json"
    
    # Check if payload is an error dictionary
    if isinstance(payload, dict) and payload.get("status") in ["unavailable", "forbidden", "error"]:
        out.write_text(
            json.dumps(
                {
                    "captured_at": datetime.now(timezone.utc).isoformat(),
                    "source": "screenpipe",
                    "status": payload["status"],
                    "error": payload.get("error", "Unknown error")
                },
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        print(f"[WARN] Screenpipe capture warning written: {out}")
        sys.exit(0)  # Exit cleanly, non-blocking

    out.write_text(
        json.dumps(
            {
                "captured_at": datetime.now(timezone.utc).isoformat(),
                "source": "screenpipe",
                "payload": payload,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(f"[OK] Screenpipe capture written: {out}")


if __name__ == "__main__":
    main()
