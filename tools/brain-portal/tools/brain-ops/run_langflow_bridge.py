from __future__ import annotations

import os
import json
from pathlib import Path

import requests
from dotenv import load_dotenv

BASE = Path(__file__).parent
load_dotenv(BASE / ".env")

LANGFLOW_BASE_URL = os.getenv("LANGFLOW_BASE_URL", "http://127.0.0.1:7860")
LANGFLOW_FLOW_ID = os.getenv("LANGFLOW_FLOW_ID", "")

PACK_PATH = BASE / "data" / "context" / "agent-context-pack.md"


def main() -> None:
    if not LANGFLOW_FLOW_ID:
        print("[SKIP] LANGFLOW_FLOW_ID empty. Bridge created, but no flow has been selected yet.")
        return

    if not PACK_PATH.exists():
        raise FileNotFoundError(f"Missing context pack: {PACK_PATH}")

    payload = {
        "input_value": PACK_PATH.read_text(encoding="utf-8"),
        "output_type": "chat",
        "input_type": "chat",
    }

    url = f"{LANGFLOW_BASE_URL}/api/v1/run/{LANGFLOW_FLOW_ID}?stream=false"
    response = requests.post(url, json=payload, timeout=180)
    response.raise_for_status()

    out = BASE / "data" / "context" / "langflow-last-response.json"
    out.write_text(json.dumps(response.json(), indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] Langflow response stored: {out}")


if __name__ == "__main__":
    main()
