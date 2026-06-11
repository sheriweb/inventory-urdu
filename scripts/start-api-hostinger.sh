#!/bin/bash
# Start Nest API once on Hostinger (flock + Node 20, low thread pool).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/tmp/api.env"
LOG="$ROOT/tmp/api.log"
LOCK="$ROOT/tmp/api.lock"
PORT="${API_INTERNAL_PORT:-4001}"
NODE_BIN="${API_NODE_BIN:-/opt/alt/alt-nodejs20/root/bin/node}"
[[ -x "$NODE_BIN" ]] || NODE_BIN="$(command -v node)"

exec 200>"$LOCK"
if ! flock -n 200; then
  exit 0
fi

if (echo >/dev/tcp/127.0.0.1/"$PORT") 2>/dev/null; then
  exit 0
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

cd "$ROOT"
export NODE_ENV=production
export HOSTINGER_COMBINED=1
export LAZY_DB_CONNECT=1
export UV_THREADPOOL_SIZE=2
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=256}"

pkill -f "$ROOT/apps/api/dist/main.js" 2>/dev/null || true
sleep 2

mkdir -p "$ROOT/tmp"
setsid nohup "$NODE_BIN" "$ROOT/apps/api/dist/main.js" >>"$LOG" 2>&1 </dev/null &
disown || true
