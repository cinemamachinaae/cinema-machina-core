#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Cinema Machina Brain Portal — Dev Server Launcher
# ─────────────────────────────────────────────────────────────
#
# CRITICAL: Run this from a normal Terminal.app session, NOT
# from an AI agent (Antigravity/Claude Code). The agent's
# sandbox blocks network operations and slows iCloud I/O to
# a crawl.
#
# This script solves two problems:
#
#   1. iCloud CloudDocs makes node_modules unbearably slow
#      (builds take 30+ minutes instead of 7 seconds).
#
#   2. The Antigravity sandbox blocks listen() / dlopen()
#      so dev servers can never bind ports.
#
# HOW TO USE:
#   cd tools/brain-portal
#   ./start-dev.sh            # default: 127.0.0.1:3000
#   ./start-dev.sh 3001       # alternative port
#   ./start-dev.sh 3001 0.0.0.0  # bind to all interfaces
#
# ─────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${1:-3000}"
HOST="${2:-127.0.0.1}"

# ── Fast local cache for node_modules + build output ──
LOCAL_CACHE="$HOME/.cache/cinema-machina/brain-portal"

echo ""
echo "╔═══════════════════════════════════════════════════╗"
echo "║   Cinema Machina Brain Portal — Dev Server        ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "  Source:  $SCRIPT_DIR"
echo "  Host:    $HOST"
echo "  Port:    $PORT"
echo ""

# Detect if we're on iCloud Drive
if [[ "$SCRIPT_DIR" == *"com~apple~CloudDocs"* ]] || [[ "$SCRIPT_DIR" == *"Mobile Documents"* ]]; then
  echo "⚡ Detected iCloud Drive — enabling local cache acceleration"
  echo "   Cache: $LOCAL_CACHE"
  echo ""
  mkdir -p "$LOCAL_CACHE"

  # Move node_modules off iCloud if it's a real directory
  if [ -d "node_modules" ] && [ ! -L "node_modules" ]; then
    echo "📦 Moving node_modules to local storage (this may take a minute)..."
    if [ -d "$LOCAL_CACHE/node_modules" ]; then
      echo "   Replacing stale local cache..."
      rm -rf "$LOCAL_CACHE/node_modules"
    fi
    mv "node_modules" "$LOCAL_CACHE/node_modules"
    ln -s "$LOCAL_CACHE/node_modules" "node_modules"
    echo "   ✓ node_modules → $LOCAL_CACHE/node_modules"
    echo ""
  elif [ -L "node_modules" ]; then
    TARGET=$(readlink "node_modules" 2>/dev/null || true)
    echo "📦 node_modules symlinked → $TARGET ✓"
    echo ""
  fi

  # Symlink .next-local build cache
  if [ -d ".next-local" ] && [ ! -L ".next-local" ]; then
    echo "🔧 Moving build cache to local storage..."
    [ -d "$LOCAL_CACHE/.next-local" ] && rm -rf "$LOCAL_CACHE/.next-local"
    mv ".next-local" "$LOCAL_CACHE/.next-local"
    ln -s "$LOCAL_CACHE/.next-local" ".next-local"
    echo "   ✓ .next-local → $LOCAL_CACHE/.next-local"
    echo ""
  elif [ ! -e ".next-local" ]; then
    mkdir -p "$LOCAL_CACHE/.next-local"
    ln -s "$LOCAL_CACHE/.next-local" ".next-local"
    echo "🔧 Created local build cache ✓"
    echo ""
  elif [ -L ".next-local" ]; then
    echo "🔧 Build cache already local ✓"
    echo ""
  fi
fi

# ── Ensure dependencies ──
if [ ! -d "node_modules/next" ] && [ ! -L "node_modules" ]; then
  echo "⏳ Installing dependencies..."
  npm install
  echo ""
elif [ -L "node_modules" ] && [ ! -d "$(readlink node_modules)/next" ]; then
  echo "⏳ Installing dependencies into local cache..."
  npm install
  echo ""
fi

# ── Check port ──
if lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  EXISTING_PID=$(lsof -i ":$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1)
  echo "⚠️  Port $PORT in use by PID $EXISTING_PID"
  read -rp "   Kill it? (y/N) " REPLY
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    kill "$EXISTING_PID" 2>/dev/null || true
    sleep 1
  else
    echo "   Use: ./start-dev.sh 3001"
    exit 1
  fi
fi

export NEXT_TELEMETRY_DISABLED=1

echo "🚀 Starting → http://$HOST:$PORT"
echo ""
exec npx next dev -H "$HOST" -p "$PORT"
