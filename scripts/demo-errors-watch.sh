#!/usr/bin/env bash
# Client errors live dekhein — Laravel storage/logs jaisa.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT/.demo/client-errors.jsonl"

mkdir -p "$ROOT/.demo"
touch "$LOG"

echo "════════════════════════════════════════════════════════"
echo "  CLIENT ERROR MONITOR (live)"
echo "  File: $LOG"
echo "  Dashboard: http://127.0.0.1:3001/demo-monitor"
echo "  Key: demo-monitor"
echo "════════════════════════════════════════════════════════"
echo ""

tail -n 20 -F "$LOG" | while read -r line; do
  if command -v jq >/dev/null 2>&1; then
    at=$(echo "$line" | jq -r '.at // "?"')
    who=$(echo "$line" | jq -r '.userEmail // "guest"')
    typ=$(echo "$line" | jq -r '.type // "error"')
    msg=$(echo "$line" | jq -r '.message // "?"')
    url=$(echo "$line" | jq -r '.url // ""')
    echo "────────────────────────────────────────────────────────"
    echo "🔴 $at | $typ | $who"
    echo "   $msg"
    [[ -n "$url" && "$url" != "null" ]] && echo "   $url"
  else
    echo "🔴 $line"
  fi
done
