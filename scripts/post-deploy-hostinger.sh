#!/usr/bin/env bash
# Server-side steps after rsync (lightweight — no build on shared hosting).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▶ Post-deploy on server: $ROOT"

chmod +x scripts/*.sh 2>/dev/null || true

if [[ -f hostinger-production.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source hostinger-production.env
  set +a
fi

echo "▶ Installing production dependencies…"
npm ci --omit=dev --no-audit --no-fund
npm run db:generate -w @inventory-urdu/api

if [[ -d node_modules/@prisma/engines ]]; then
  chmod +x node_modules/@prisma/engines/schema-engine* 2>/dev/null || true
  chmod +x node_modules/@prisma/engines/libquery_engine* 2>/dev/null || true
fi

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "▶ Syncing DB schema (prisma db push)…"
  (cd apps/api && node ../../node_modules/prisma/build/index.js db push --skip-generate)
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
