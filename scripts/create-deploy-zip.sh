#!/usr/bin/env bash
# Creates source ZIP for Hostinger Node.js upload (no node_modules, no build output).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="$ROOT/deploy/inventory-urdu_${STAMP}.zip"

cd "$ROOT"
zip -r "$OUT" . \
  -x "node_modules/*" \
  -x "*/node_modules/*" \
  -x ".git/*" \
  -x "apps/web/.next/*" \
  -x "apps/admin/.next/*" \
  -x "apps/api/dist/*" \
  -x "deploy/secrets.env" \
  -x ".env" \
  -x "apps/api/.env" \
  -x "deploy/*.zip" \
  -x ".turbo/*" \
  -x "uploads/*" \
  -x "*.log"

echo "✅ Created: $OUT"
ls -lh "$OUT"
