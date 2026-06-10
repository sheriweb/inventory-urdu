#!/usr/bin/env bash
# Build + ZIP for HosterPK cPanel upload (leasing-store.com)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date +%Y%m%d_%H%M%S)"
OUT_ZIP="$ROOT/deploy/leasing-store_${STAMP}.zip"
ENV_FILE="$ROOT/deploy/leasing-store-production.env"

echo "▶ Building production bundle…"
cd "$ROOT"
npm run hostinger:build
bash scripts/prepare-ftp-deploy.sh

echo "▶ Creating ZIP…"
cd "$ROOT/deploy-output"
zip -r "$OUT_ZIP" . -x "*.git*" -x "deploy/secrets.env"
cp "$ENV_FILE" "$ROOT/deploy-output/leasing-store-production.env" 2>/dev/null || true

echo ""
echo "✅ Ready for cPanel upload:"
echo "   ZIP:  $OUT_ZIP"
echo "   ENV:  $ENV_FILE"
ls -lh "$OUT_ZIP"
