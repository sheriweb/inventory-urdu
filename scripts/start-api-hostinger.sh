#!/bin/bash
# Start Nest API outside Passenger process tree (Hostinger shared hosting).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/tmp/api.env"
LOG="$ROOT/tmp/api.log"
PORT="${API_INTERNAL_PORT:-4001}"
NODE_BIN="${API_NODE_BIN:-/opt/alt/alt-nodejs18/root/bin/node}"
[[ -x "$NODE_BIN" ]] || NODE_BIN="$(command -v node)"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

cd "$ROOT"
export NODE_ENV=production
export HOSTINGER_COMBINED=1

if (echo >/dev/tcp/127.0.0.1/"$PORT") 2>/dev/null; then
  exit 0
fi

pkill -f "$ROOT/apps/api/dist/main.js" 2>/dev/null || true
sleep 1

mkdir -p "$ROOT/tmp"
setsid nohup "$NODE_BIN" "$ROOT/apps/api/dist/main.js" >>"$LOG" 2>&1 </dev/null &
disown || true
