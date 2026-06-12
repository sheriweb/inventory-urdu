#!/usr/bin/env bash
# Copy static assets into Next standalone output (required for Hostinger deploy).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STANDALONE="$ROOT/apps/web/.next/standalone/apps/web"

if [[ ! -f "$STANDALONE/server.js" ]]; then
  echo "⚠ standalone server.js not found — skip asset copy"
  exit 0
fi

mkdir -p "$STANDALONE/.next"
cp -a "$ROOT/apps/web/public" "$STANDALONE/public"
cp -a "$ROOT/apps/web/.next/static" "$STANDALONE/.next/static"
echo "✓ standalone static assets copied"
