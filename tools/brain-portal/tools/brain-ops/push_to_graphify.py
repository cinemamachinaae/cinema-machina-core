from __future__ import annotations

import os
import json
import shutil
from pathlib import Path

from dotenv import load_dotenv

BASE = Path(__file__).parent
load_dotenv(BASE / ".env")

CAPSULE_DIR = BASE / "data" / "capsules"
GRAPHIFY_CONTEXT_DIR = Path(os.getenv("GRAPHIFY_CONTEXT_DIR", "")).expanduser()
GRAPHIFY_CONTEXT_DIR.mkdir(parents=True, exist_ok=True)


def latest_capsule() -> Path:
    files = sorted(CAPSULE_DIR.glob("context-capsule-*.json"), reverse=True)
    if not files:
        raise FileNotFoundError("No capsule found.")
    return files[0]


def main() -> None:
    capsule = latest_capsule()
    target = GRAPHIFY_CONTEXT_DIR / capsule.name
    shutil.copy2(capsule, target)

    index_file = GRAPHIFY_CONTEXT_DIR / "index.json"
    index = []

    if index_file.exists():
        try:
            index = json.loads(index_file.read_text(encoding="utf-8"))
        except Exception:
            index = []

    if capsule.name not in index:
        index.append(capsule.name)

    index = index[-200:]

    index_file.write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"[OK] Capsule linked to Graphify context: {target}")


if __name__ == "__main__":
    main()
