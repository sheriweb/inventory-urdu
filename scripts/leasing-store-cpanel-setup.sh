#!/usr/bin/env bash
# Run once in cPanel → Advanced → Terminal (after Node.js app is created).
set -euo pipefail

cd ~/inventory-urdu

export PATH="/opt/alt/alt-nodejs20/root/usr/bin:${PATH:-/usr/bin:/bin}"
NODE="$(command -v node || true)"
NPM="$(command -v npm || true)"

if [[ -z "$NODE" || -z "$NPM" ]]; then
  echo "Node 20 not found. Create Node.js app in cPanel first (version 20.x)."
  exit 1
fi

echo "Using node: $($NODE -v)"

if [[ -f leasing-store-production.env ]]; then
  cp -f leasing-store-production.env apps/api/.env
fi

export NPM_CONFIG_PRODUCTION=false
$NPM ci --ignore-scripts --no-audit --no-fund

cd apps/api
$NODE ../../node_modules/prisma/build/index.js generate
export DATABASE_URL="${DATABASE_URL:-$(grep '^DATABASE_URL=' ../../leasing-store-production.env | cut -d= -f2-)}"
$NODE ../../node_modules/prisma/build/index.js db push --skip-generate

cd ~/inventory-urdu
mkdir -p tmp
touch tmp/restart.txt

echo "✅ Setup complete. cPanel → Setup Node.js App → Restart app."
