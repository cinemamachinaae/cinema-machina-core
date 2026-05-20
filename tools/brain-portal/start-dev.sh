#!/usr/bin/env bash
# Cinema Machina Brain Portal — local SSD dev server launcher.
#
# Usage:
#   ./start-dev.sh                 # 0.0.0.0:3000
#   ./start-dev.sh 3001            # 0.0.0.0:3001
#   ./start-dev.sh 3001 127.0.0.1  # loopback-only

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${1:-3000}"
HOST="${2:-0.0.0.0}"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║   Cinema Machina Brain Portal — Dev Server        ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "  Source:  $SCRIPT_DIR"
echo "  Host:    $HOST"
echo "  Port:    $PORT"
echo ""

if [ ! -d "node_modules" ]; then
  echo "Missing node_modules. Run: npm ci"
  exit 1
fi

if [ ! -x "node_modules/.bin/next" ]; then
  echo "Missing Next.js binary. Run: npm ci"
  exit 1
fi

if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  EXISTING_PID=$(lsof -i ":$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)
  echo "Port $PORT is already in use by PID $EXISTING_PID."
  echo "Stop that process or use: ./start-dev.sh 3001"
  exit 1
fi

export NEXT_TELEMETRY_DISABLED=1

TAILSCALE_IP=""
if command -v tailscale >/dev/null 2>&1; then
  TAILSCALE_IP="$(tailscale ip -4 2>/dev/null | head -1 || true)"
fi
[ -z "$TAILSCALE_IP" ] && TAILSCALE_IP="100.89.153.1"

echo "Local:    http://127.0.0.1:$PORT/"
echo "Network:  http://<mac-lan-ip>:$PORT/"
echo "Tailnet:  http://$TAILSCALE_IP:$PORT/"
echo ""
echo "Starting Brain Portal..."
echo ""
exec npm run dev -- -H "$HOST" -p "$PORT"
