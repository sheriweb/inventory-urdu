#!/usr/bin/env bash
# Local smoke test — run BEFORE any Hostinger redeploy.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${VERIFY_PORT:-3990}"
API_PORT="${API_INTERNAL_PORT:-4001}"
LOG="$ROOT/tmp/verify-boot.log"

rm -f "$LOG" "$ROOT/tmp/web.lock" "$ROOT/tmp/web-boot.dir/pid" 2>/dev/null || true
rm -rf "$ROOT/tmp/web-boot.dir" "$ROOT/tmp/api-schedule.dir" 2>/dev/null || true
mkdir -p "$ROOT/tmp"

fail() {
  echo "❌ $*"
  exit 1
}

pass() {
  echo "✅ $*"
}

echo "▶ Checking build artifacts…"
[[ -f apps/api/dist/main.js ]] || fail "Missing apps/api/dist/main.js — run: npm run hostinger:build"
[[ -f apps/web/.next/BUILD_ID ]] || fail "Missing apps/web/.next — run: npm run hostinger:build"
pass "Build artifacts OK"

echo "▶ Starting server.js on port ${PORT}..."
PORT="$PORT" START_API_ON_BOOT=0 API_START_DELAY_MS=60000 \
  node "$ROOT/server.js" >>"$LOG" 2>&1 &
MAIN_PID=$!
sleep 8

if ! kill -0 "$MAIN_PID" 2>/dev/null; then
  echo "--- log ---"
  cat "$LOG" || true
  fail "Starter exited early (pid $MAIN_PID)"
fi

READY_COUNT=$(grep -E 'Ready in|Next.js ready on' "$LOG" 2>/dev/null | wc -l | tr -d ' ')
if [[ "$READY_COUNT" -ne 1 ]]; then
  echo "--- log ---"
  cat "$LOG" || true
  kill "$MAIN_PID" 2>/dev/null || true
  fail "Expected exactly 1 ready line, got $READY_COUNT (duplicate Next boot?)"
fi
pass "Single Next.js ready"

HTTP=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:$PORT/login" || echo 000)
if [[ "$HTTP" != "200" ]]; then
  cat "$LOG" || true
  kill "$MAIN_PID" 2>/dev/null || true
  fail "/login returned HTTP $HTTP (expected 200)"
fi
pass "HTTP /login → 200"

echo "▶ Simulating duplicate Passenger worker…"
PORT="$PORT" START_API_ON_BOOT=0 node "$ROOT/server.js" >>"$LOG" 2>&1 &
DUP_PID=$!
sleep 2
if kill -0 "$DUP_PID" 2>/dev/null; then
  kill "$DUP_PID" 2>/dev/null || true
  cat "$LOG" || true
  fail "Duplicate worker still running (should exit 0 immediately)"
fi
pass "Duplicate worker exited immediately"

LISTENERS=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null | wc -l | tr -d ' ')
if [[ "$LISTENERS" -ne 1 ]]; then
  kill "$MAIN_PID" 2>/dev/null || true
  fail "Expected 1 listener on port $PORT, found $LISTENERS"
fi
pass "Single listener on port $PORT"

kill "$MAIN_PID" 2>/dev/null || true
wait "$MAIN_PID" 2>/dev/null || true

echo ""
echo "✅ All local Hostinger boot checks passed."
echo "   Do NOT redeploy until Hostinger process limit has cleared (~30–60 min)."
echo "   Entry file in hPanel: server.js"
