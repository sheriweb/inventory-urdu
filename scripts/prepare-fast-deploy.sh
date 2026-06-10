#!/usr/bin/env bash
# Small deploy bundle — dist + .next only (no node_modules). ~50–120 MB.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy-fast"

rm -rf "$OUT"
mkdir -p "$OUT"

copy() {
  local src="$1" dest="$2"
  mkdir -p "$(dirname "$OUT/$dest")"
  rsync -a "$src" "$OUT/$dest"
}

copy "$ROOT/package.json" "package.json"
copy "$ROOT/package-lock.json" "package-lock.json"
copy "$ROOT/.npmrc" ".npmrc" 2>/dev/null || true
copy "$ROOT/scripts/hostinger-combined-start.mjs" "scripts/hostinger-combined-start.mjs"
copy "$ROOT/scripts/cpanel-install.mjs" "scripts/cpanel-install.mjs"
copy "$ROOT/scripts/idle.mjs" "scripts/idle.mjs"
copy "$ROOT/.cpanel.yml" ".cpanel.yml"
copy "$ROOT/apps/api/dist" "apps/api/dist"
copy "$ROOT/apps/api/prisma" "apps/api/prisma"
copy "$ROOT/apps/api/package.json" "apps/api/package.json"
mkdir -p "$OUT/apps/web/.next"
rsync -a --exclude 'cache' "$ROOT/apps/web/.next/" "$OUT/apps/web/.next/"
copy "$ROOT/apps/web/package.json" "apps/web/package.json"
copy "$ROOT/apps/web/next.config.ts" "apps/web/next.config.ts"
copy "$ROOT/apps/web/public" "apps/web/public"
copy "$ROOT/packages/shared" "packages/shared"

if [ -f "$ROOT/deploy/leasing-store-production.env" ]; then
  copy "$ROOT/deploy/leasing-store-production.env" "leasing-store-production.env"
fi

mkdir -p "$OUT/tmp"
echo "✅ Fast deploy bundle: $OUT ($(du -sh "$OUT" | cut -f1))"
