#!/usr/bin/env bash
# Ek tunnel start karo — URL tab tak same rahega jab tak yeh process zinda hai.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO_DIR="$ROOT/.demo"
WEB_PORT="${DEMO_WEB_PORT:-3001}"
LOG="$DEMO_DIR/tunnel.log"
URL_FILE="$DEMO_DIR/tunnel.url"
PID_FILE="$DEMO_DIR/tunnel.pid"

mkdir -p "$DEMO_DIR"

tunnel_alive() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null
}

tunnel_url_works() {
  local url
  [[ -f "$URL_FILE" ]] || return 1
  url="$(tr -d '[:space:]' < "$URL_FILE")"
  [[ -n "$url" ]] || return 1
  curl -sS -o /dev/null --max-time 8 "$url/login" 2>/dev/null
}

if tunnel_alive && tunnel_url_works; then
  echo "$(tr -d '[:space:]' < "$URL_FILE")"
  exit 0
fi

# Purani dead tunnel — nayi sirf tab jab zaroorat ho
pkill -f "cloudflared tunnel --url http://127.0.0.1:$WEB_PORT" 2>/dev/null || true
sleep 1

: > "$LOG"
nohup /usr/local/bin/cloudflared tunnel --url "http://127.0.0.1:$WEB_PORT" >> "$LOG" 2>&1 &
echo $! > "$PID_FILE"

TUNNEL_URL=""
for i in $(seq 1 60); do
  TUNNEL_URL=$(grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)
  [[ -n "$TUNNEL_URL" ]] && break
  sleep 1
done

if [[ -z "$TUNNEL_URL" ]]; then
  echo "ERROR: tunnel URL not found" >&2
  exit 1
fi

echo "$TUNNEL_URL" > "$URL_FILE"
echo "$TUNNEL_URL"
