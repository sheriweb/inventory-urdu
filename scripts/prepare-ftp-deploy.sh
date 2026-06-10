#!/usr/bin/env bash
# Prepare folder for FTP upload (built app, no node_modules).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy-output"

rm -rf "$OUT"
mkdir -p "$OUT"

rsync -a \
  --exclude node_modules \
  --exclude 'node_modules/**' \
  --exclude .git \
  --exclude deploy-output \
  --exclude deploy/secrets.env \
  --exclude deploy/leasing-store-deploy-key \
  --exclude deploy/leasing-store-deploy-key.pub \
  --exclude apps/api/.env \
  --exclude 'deploy/*.zip' \
  --exclude .turbo \
  --exclude uploads \
  "$ROOT/" "$OUT/"

echo "✅ FTP deploy folder ready: $OUT ($(du -sh "$OUT" | cut -f1))"
