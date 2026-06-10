#!/usr/bin/env bash
# Client demo band karo — sleep wapas normal.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO_DIR="$ROOT/.demo"

stop_pid() {
  local file="$1"
  local label="$2"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "✓ $label band ($pid)"
    fi
    rm -f "$file"
  fi
}

stop_pid "$DEMO_DIR/tunnel.pid" "Tunnel"
pkill -f "cloudflared tunnel --url" 2>/dev/null || true
stop_pid "$DEMO_DIR/caffeinate.pid" "Sleep lock"
stop_pid "$DEMO_DIR/demo.pid" "Dev server"

# turbo/npm child processes
pkill -f "turbo run dev" 2>/dev/null || true
pkill -f "next dev -p" 2>/dev/null || true
pkill -f "nest start --watch" 2>/dev/null || true

rm -f "$DEMO_DIR/tunnel.url"
echo "✅ Demo band — Mac sleep normal ho gayi."
