from __future__ import annotations

import os
import sys
import json
import re
from pathlib import Path
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

BASE = Path(__file__).parent
load_dotenv(BASE / ".env")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")

RAW_DIR = BASE / "data" / "raw"
CAPSULE_DIR = BASE / "data" / "capsules"
CAPSULE_DIR.mkdir(parents=True, exist_ok=True)


def latest_raw() -> Path:
    files = sorted(RAW_DIR.glob("screenpipe-recent-*.json"), reverse=True)
    if not files:
        raise FileNotFoundError("No Screenpipe raw capture found.")
    return files[0]


def extract_json(text: str) -> dict:
    match = re.search(r"\{.*\}", text, flags=re.S)
    if not match:
        raise ValueError("No JSON object found in Ollama response.")
    return json.loads(match.group(0))


def main() -> None:
    try:
        raw_path = latest_raw()
        raw = json.loads(raw_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[WARN] Failed to read latest raw file: {e}")
        sys.exit(0)

    prompt = f"""
You are the Cinema Machina local brain compressor.

Convert this Screenpipe activity payload into a precise, token-efficient engineering context capsule.

Rules:
- Remove passwords, API keys, private tokens, copied secrets, and irrelevant personal chatter.
- Focus on Cinema Machina website, Cinema Machina Core app, Brain Portal, Graphify, Codex, Claude Code, Antigravity, Langflow, RuFlo, Ollama/Qwen.
- Detect meaningful coding work, debugging, file edits, test/build failures, architecture decisions, and unresolved issues.
- Ignore low-value noise.
- Output strict JSON only.

Return exactly:
{{
  "project": "cinema-machina",
  "captured_at": "{datetime.now(timezone.utc).isoformat()}",
  "summary": "string",
  "active_workstreams": ["..."],
  "files_or_modules": ["..."],
  "bugs_or_failures": ["..."],
  "fixes_or_progress": ["..."],
  "integration_signals": ["..."],
  "decisions": ["..."],
  "next_actions": ["..."],
  "graph_entities": ["..."],
  "confidence": "high|medium|low"
}}

Payload:
{json.dumps(raw, ensure_ascii=False)[:70000]}
"""

    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "format": "json",
            },
            timeout=180,
        )
        response.raise_for_status()

        content = response.json().get("response", "")
        capsule = extract_json(content)
    except Exception as e:
        print(f"[WARN] Failed to generate capsule via Ollama: {e}")
        capsule = {
            "project": "cinema-machina",
            "captured_at": datetime.now(timezone.utc).isoformat(),
            "summary": "Capsule generation failed due to Ollama connection error or parsing failure.",
            "active_workstreams": [],
            "files_or_modules": [],
            "bugs_or_failures": [str(e)],
            "fixes_or_progress": [],
            "integration_signals": [],
            "decisions": [],
            "next_actions": [],
            "graph_entities": [],
            "confidence": "low"
        }

    out = CAPSULE_DIR / f"context-capsule-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.json"
    out.write_text(json.dumps(capsule, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] Capsule written: {out}")


if __name__ == "__main__":
    main()
