#!/usr/bin/env bash
# Full deploy to leasing-store.com via FTP (no cPanel clicks needed).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FTP_HOST="${LEASING_FTP_HOST:-leasing-store.com}"
FTP_USER="${LEASING_FTP_USER:-deploy@leasing-store.com}"
FTP_PASS="${LEASING_FTP_PASS:-SHERIIabc@2026}"
FTP_PORT="${LEASING_FTP_PORT:-21}"

ENV_FILE="$ROOT/deploy/leasing-store-production.env"
OUT="$ROOT/deploy-output"
NM_FLAT="$OUT/nm-flat"

echo "▶ 1/4 Build production (leasing-store.com)…"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
export HOSTINGER_COMBINED=1
export INTERNAL_API_URL=http://127.0.0.1:4001
npm run hostinger:build

echo "▶ 2/4 Prepare deploy folder…"
bash scripts/prepare-ftp-deploy.sh
cp "$ENV_FILE" "$OUT/leasing-store-production.env"

if [ ! -d "$NM_FLAT/next" ]; then
  echo "▶ 2b Linux node_modules (Docker)…"
  mkdir -p "$NM_FLAT"
  docker run --rm \
    -v "$ROOT:/app" \
    -w /app \
    node:20-bookworm-slim \
    bash -lc 'rm -rf /tmp/nm && npm ci --ignore-scripts --no-audit --no-fund && npm run db:generate -w @inventory-urdu/api && cp -a node_modules /tmp/nm'
  rsync -a --delete "$ROOT/node_modules/" "$NM_FLAT/"
fi

echo "▶ 3/4 FTP upload app files…"
lftp -u "$FTP_USER","$FTP_PASS" "ftp://$FTP_HOST:$FTP_PORT" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
set net:timeout 60
set net:max-retries 3
set mirror:parallel-transfer-count 4
cd inventory-urdu
rm -f .maintenance
lcd $OUT
mirror -R --parallel=4 --exclude nm-flat/ --exclude .git/ .
bye
EOF

echo "▶ 4/4 FTP upload node_modules → nodevenv…"
lftp -u "$FTP_USER","$FTP_PASS" "ftp://$FTP_HOST:$FTP_PORT" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
set net:timeout 120
set net:max-retries 5
set mirror:parallel-transfer-count 4
cd nodevenv/inventory-urdu/20/lib/node_modules
lcd $NM_FLAT
mirror -R --parallel=4 .
bye
EOF

echo "✅ Deploy complete. cPanel → Setup Node.js App → RESTART (if site not up in 1 min)."
