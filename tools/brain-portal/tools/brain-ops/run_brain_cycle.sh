#!/usr/bin/env bash
set -euo pipefail

BASE="$(cd "$(dirname "$0")" && pwd)"
cd "$BASE"

source .venv/bin/activate

python ingest_screenpipe.py
python build_capsule.py
python push_to_graphify.py
python build_agent_pack.py
python run_langflow_bridge.py

echo "[OK] Cinema Machina brain cycle complete."
