#!/usr/bin/env bash
# Hostinger / LiteSpeed Passenger — use official Next standalone/start (Passenger-friendly).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
LOG="$ROOT/tmp/hostinger.log"
mkdir -p "$ROOT/tmp"

log() {
  echo "[$(date -Is)] $*" | tee -a "$LOG"
}

log "passenger-start pid=$$ user=$(whoami 2>/dev/null || echo unknown)"

for env_file in "$ROOT/hostinger-production.env" "$ROOT/deploy/hostinger-production.env" "$ROOT/.env"; do
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
    log "loaded env: $env_file"
    break
  fi
done

export NODE_ENV=production
export HOSTINGER_COMBINED=1
export INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:4001}"
export WEB_NODE_OPTIONS="${WEB_NODE_OPTIONS:---max-old-space-size=256}"
export NODE_OPTIONS="$WEB_NODE_OPTIONS"
export API_NODE_OPTIONS="${API_NODE_OPTIONS:---max-old-space-size=192}"
PORT="${PORT:-${PASSENGER_PORT:-3000}}"

if [[ ! -f "$ROOT/apps/api/dist/main.js" ]]; then
  log "FATAL: apps/api/dist/main.js missing"
  exit 1
fi
if [[ ! -f "$WEB/.next/BUILD_ID" ]]; then
  log "FATAL: apps/web/.next build missing"
  exit 1
fi

# API in background — do not block web boot
bash "$ROOT/scripts/start-api-hostinger.sh" >>"$LOG" 2>&1 &

STANDALONE_SERVER="$WEB/.next/standalone/apps/web/server.js"
if [[ -f "$STANDALONE_SERVER" ]]; then
  log "exec standalone server on 0.0.0.0:$PORT"
  cd "$WEB/.next/standalone"
  exec node apps/web/server.js
fi

NEXT_BIN="$ROOT/node_modules/next/dist/bin/next"
if [[ ! -f "$NEXT_BIN" ]]; then
  log "FATAL: next binary missing at $NEXT_BIN"
  exit 1
fi

log "exec next start on 0.0.0.0:$PORT"
cd "$WEB"
exec node "$NEXT_BIN" start -p "$PORT" -H 0.0.0.0
