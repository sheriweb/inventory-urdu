#!/usr/bin/env bash
# Production entry for Hostinger (flock + exec next). hPanel entry file: scripts/hostinger-production-start.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
API="$ROOT/apps/api"
LOG="$ROOT/tmp/hostinger.log"
LOCK="$ROOT/tmp/web.lock"
PORT="${PORT:-${PASSENGER_PORT:-3000}}"
API_PORT="${API_INTERNAL_PORT:-4001}"
API_DELAY="${API_START_DELAY_MS:-180000}"

mkdir -p "$ROOT/tmp"

log() {
  local ts
  ts="$(date -u '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date)"
  echo "[$ts] [hostinger] $*" | tee -a "$LOG"
}

for env_file in "$ROOT/hostinger-production.env" "$ROOT/deploy/hostinger-production.env" "$ROOT/.env"; do
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
    break
  fi
done

export NODE_ENV=production
export HOSTINGER_COMBINED=1
export INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:$API_PORT}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT
export WEB_NODE_OPTIONS="${WEB_NODE_OPTIONS:---max-old-space-size=256}"
export NODE_OPTIONS="$WEB_NODE_OPTIONS"

if [[ ! -f "$API/dist/main.js" ]]; then
  log "FATAL: apps/api/dist/main.js missing"
  exit 1
fi
if [[ ! -f "$WEB/.next/BUILD_ID" ]]; then
  log "FATAL: apps/web/.next build missing"
  exit 1
fi

if (echo >/dev/tcp/127.0.0.1/"$PORT") 2>/dev/null; then
  log "PORT $PORT already listening — duplicate worker exits"
  exit 0
fi

WEB_BOOT_DIR="$ROOT/tmp/web-boot.dir"
if [[ -d "$WEB_BOOT_DIR" ]]; then
  old_pid="$(cat "$WEB_BOOT_DIR/pid" 2>/dev/null || echo 0)"
  if [[ -n "$old_pid" ]] && kill -0 "$old_pid" 2>/dev/null && (echo >/dev/tcp/127.0.0.1/"$PORT") 2>/dev/null; then
    log "Web boot already running (pid $old_pid) — duplicate worker exits"
    exit 0
  fi
  rm -rf "$WEB_BOOT_DIR"
fi
mkdir "$WEB_BOOT_DIR"
echo "$$" >"$WEB_BOOT_DIR/pid"

if (echo >/dev/tcp/127.0.0.1/"$PORT") 2>/dev/null; then
  log "PORT $PORT opened by peer — duplicate worker exits"
  exit 0
fi

if [[ "${START_API_ON_BOOT:-0}" == "1" ]]; then
  API_SCHEDULE_DIR="$ROOT/tmp/api-schedule.dir"
  if mkdir "$API_SCHEDULE_DIR" 2>/dev/null; then
    (
      sleep "$(( API_DELAY / 1000 ))"
      if (echo >/dev/tcp/127.0.0.1/"$API_PORT") 2>/dev/null; then
        log "API already on 127.0.0.1:$API_PORT"
        exit 0
      fi
      log "Starting API on 127.0.0.1:$API_PORT (delayed ${API_DELAY}ms)…"
      bash "$ROOT/scripts/start-api-hostinger.sh" >>"$LOG" 2>&1
    ) &
  else
    log "API start already scheduled"
  fi
fi

NEXT_BIN="$ROOT/node_modules/next/dist/bin/next"
if [[ ! -f "$NEXT_BIN" ]]; then
  log "FATAL: next binary missing"
  exit 1
fi

date +%s >"$ROOT/tmp/restart.txt" 2>/dev/null || true
log "exec next start on 0.0.0.0:$PORT (pid=$$)"
cd "$WEB"
exec node "$NEXT_BIN" start -p "$PORT" -H 0.0.0.0
