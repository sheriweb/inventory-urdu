#!/usr/bin/env bash
# Recover 503 — kill stale Node processes, reinstall deps, restart app.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS="$ROOT/deploy/secrets.env"
_PRESET_DATABASE_URL="${DATABASE_URL:-}"

if [[ -f "$SECRETS" ]]; then
  # shellcheck disable=SC1090
  source "$SECRETS"
fi

if [[ -n "$_PRESET_DATABASE_URL" ]]; then
  DATABASE_URL="$_PRESET_DATABASE_URL"
fi

SSH_HOST="${SSH_HOST:-156.67.67.67}"
SSH_PORT="${SSH_PORT:-65002}"
SSH_USER="${SSH_USER:-u938549775}"
SSH_PASSWORD="${SSH_PASSWORD:?SSH_PASSWORD required}"
SSH_REMOTE_PATH="${SSH_REMOTE_PATH:-/home/u938549775/domains/hotpink-tarsier-652805.hostingersite.com/nodejs}"
DATABASE_URL="${DATABASE_URL:-mysql://u938549775_testinven1:Testinven%40123@127.0.0.1:3306/u938549775_testinven1}"

SSH_OPTS=(-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -p "$SSH_PORT")
export SSHPASS="$SSH_PASSWORD"

echo "▶ Recovering $SSH_USER@$SSH_HOST …"
sshpass -e ssh "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST" "export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH
pkill -f 'node dist/main.js' 2>/dev/null || true
pkill -f 'next-server' 2>/dev/null || true
sleep 3
cd '$SSH_REMOTE_PATH'
rm -rf node_modules
npm ci --ignore-scripts --no-audit --no-fund
node node_modules/prisma/build/index.js generate --schema=apps/api/prisma/schema.prisma
cat > apps/api/.env << 'ENVEOF'
NODE_ENV=production
DATABASE_URL=$DATABASE_URL
JWT_ACCESS_SECRET=sb4pJzl2e4pnrmUIRymMDgI8M6cwtG7NHYVHOhrN3ANu6zmOzeanX18iNJaaKpNe
JWT_REFRESH_SECRET=dIe3qDHykUp4D6YY9awD/oS3AAzcYVI2bS0VbHIno+JHX5oUr8JOKVQLfkvpha8f
JWT_ACCESS_EXPIRATION=365d
JWT_REFRESH_EXPIRATION=3650d
API_PORT=4001
API_PREFIX=api/v1
CORS_ORIGINS=https://hotpink-tarsier-652805.hostingersite.com
SUPER_ADMIN_EMAIL=admin@sheriweb.com
SUPER_ADMIN_PASSWORD=InvUrdu2026!Live
SUPER_ADMIN_NAME=Super Admin
ENVEOF
touch tmp/restart.txt
echo '✅ Recovery done — wait 30s then open site'"

echo "▶ Check: https://hotpink-tarsier-652805.hostingersite.com/login"
