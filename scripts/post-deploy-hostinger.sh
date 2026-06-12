#!/usr/bin/env bash
# Server-side steps after rsync (lightweight — no build on shared hosting).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▶ Post-deploy on server: $ROOT"

CHUNKS_DIR="apps/web/.next/static"
PREV_STATIC="tmp/prev-next-static"
mkdir -p tmp
if [[ -d "$PREV_STATIC" && -d "$CHUNKS_DIR" ]]; then
  echo "▶ Merging previous _next/static assets (prevent chunk 404 after deploy)…"
  cp -an "$PREV_STATIC/." "$CHUNKS_DIR/" 2>/dev/null || true
fi
if [[ -d "$CHUNKS_DIR" ]]; then
  rm -rf "$PREV_STATIC"
  mkdir -p "$PREV_STATIC"
  cp -a "$CHUNKS_DIR/." "$PREV_STATIC/" 2>/dev/null || true
fi

chmod +x scripts/*.sh 2>/dev/null || true

if [[ -f hostinger-production.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source hostinger-production.env
  set +a
fi

bash scripts/hostinger-standalone-assets.sh 2>/dev/null || true

echo "▶ Installing production dependencies…"
npm ci --omit=dev --no-audit --no-fund
npm run db:generate -w @inventory-urdu/api

if [[ -d node_modules/@prisma/engines ]]; then
  chmod +x node_modules/@prisma/engines/schema-engine* 2>/dev/null || true
  chmod +x node_modules/@prisma/engines/libquery_engine* 2>/dev/null || true
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "▶ Syncing DB schema (prisma db push)…"
  for attempt in 1 2 3; do
    if (cd apps/api && node ../../node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss); then
      break
    fi
    echo "⚠ db push attempt $attempt failed — retrying in 5s…"
    sleep 5
    if [[ "$attempt" == "3" ]]; then
      echo "⚠ db push failed after 3 attempts — app will still restart"
    fi
  done
fi

if [[ "${RUN_DB_SETUP:-0}" == "1" && -n "${DATABASE_URL:-}" && "${FORCE_DB_SETUP:-0}" == "1" ]]; then
  echo "▶ FORCE_DB_SETUP=1 — seeding database…"
  npm run db:seed -w @inventory-urdu/api
fi

echo "▶ Removing deploy cruft…"
rm -f tmp/api-dist.tgz tmp/api-manual*.log tmp/manual-web.log 2>/dev/null || true
find . -name '.DS_Store' -delete 2>/dev/null || true
find . -name '._*' -delete 2>/dev/null || true

mkdir -p tmp
echo "▶ Starting API + restarting Passenger…"
bash scripts/start-api-hostinger.sh
touch tmp/restart.txt

echo "✅ Post-deploy complete"
