#!/usr/bin/env bash
# Deploy to cPanel subdomain (test.staging.glassassistuk.co.uk)
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

SSH_HOST="${CPANEL_SSH_HOST:-185.67.45.54}"
SSH_PORT="${CPANEL_SSH_PORT:-22}"
SSH_USER="${CPANEL_SSH_USER:-root}"
SSH_PASSWORD="${CPANEL_SSH_PASSWORD:?CPANEL_SSH_PASSWORD required}"
SSH_REMOTE_PATH="${CPANEL_REMOTE_PATH:-/home/stagingga/inventory-urdu}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL required}"
APP_URL="${CPANEL_APP_URL:-https://test.staging.glassassistuk.co.uk}"
APP_PORT="${CPANEL_APP_PORT:-13001}"
SKIP_BUILD="${SKIP_BUILD:-0}"

SSH_OPTS=(-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -p "$SSH_PORT")
export SSHPASS="$SSH_PASSWORD"

ssh_cmd() {
  sshpass -e ssh "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST" "$@"
}

rsync_upload() {
  local src="${1:?}"
  sshpass -e rsync -az \
    -e "ssh ${SSH_OPTS[*]}" \
    --exclude node_modules \
    --exclude .git \
    --exclude uploads \
    "$src/" "$SSH_USER@$SSH_HOST:$SSH_REMOTE_PATH/"
}

if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "▶ Building…"
  cd "$ROOT"
  npm ci
  npm run hostinger:build
  bash scripts/prepare-ftp-deploy.sh
fi

OUT="$ROOT/deploy-output"
[[ -d "$OUT" ]] || { echo "Missing $OUT"; exit 1; }

echo "▶ Uploading to $SSH_HOST:$SSH_REMOTE_PATH …"
ssh_cmd "mkdir -p '$SSH_REMOTE_PATH' && chown stagingga:stagingga '$SSH_REMOTE_PATH'"
rsync_upload "$OUT"

echo "▶ Server setup (deps, DB, service, Apache proxy)…"
# shellcheck disable=SC2016
ssh_cmd "export REMOTE='$SSH_REMOTE_PATH' DB_URL='$DATABASE_URL' APP_URL='$APP_URL' APP_PORT='$APP_PORT'
NODE=/home/stagingga/.nvm/versions/node/v20.20.2/bin/node
NPM=/home/stagingga/.nvm/versions/node/v20.20.2/bin/npm

chown -R stagingga:stagingga \"\$REMOTE\"

su - stagingga -s /bin/bash -c \"
  export PATH=/home/stagingga/.nvm/versions/node/v20.20.2/bin:\\\$PATH
  cd \\\$REMOTE
  npm ci --ignore-scripts --no-audit --no-fund
  \\\$NODE node_modules/prisma/build/index.js generate --schema=apps/api/prisma/schema.prisma
\"

cat > \"\$REMOTE/apps/api/.env\" << ENVEOF
NODE_ENV=production
DATABASE_URL=\$DB_URL
JWT_ACCESS_SECRET=sb4pJzl2e4pnrmUIRymMDgI8M6cwtG7NHYVHOhrN3ANu6zmOzeanX18iNJaaKpNe
JWT_REFRESH_SECRET=dIe3qDHykUp4D6YY9awD/oS3AAzcYVI2bS0VbHIno+JHX5oUr8JOKVQLfkvpha8f
JWT_ACCESS_EXPIRATION=365d
JWT_REFRESH_EXPIRATION=3650d
API_PORT=4001
API_PREFIX=api/v1
CORS_ORIGINS=\$APP_URL
NEXT_PUBLIC_API_URL=\$APP_URL/api/v1
ENVEOF
chown stagingga:stagingga \"\$REMOTE/apps/api/.env\"

su - stagingga -s /bin/bash -c \"
  export PATH=/home/stagingga/.nvm/versions/node/v20.20.2/bin:\\\$PATH
  cd \\\$REMOTE/apps/api
  \\\$NODE ../../node_modules/prisma/build/index.js db push --skip-generate
  \\\$NODE ../../node_modules/ts-node/dist/bin.js -r tsconfig-paths/register prisma/seed.ts || true
\"

cat > /etc/systemd/system/inventory-test.service << SVCEOF
[Unit]
Description=Inventory Urdu test.staging
After=network.target mysql.service

[Service]
Type=simple
User=stagingga
WorkingDirectory=\$REMOTE
Environment=PORT=\$APP_PORT
Environment=HOSTINGER_COMBINED=1
Environment=INTERNAL_API_URL=http://127.0.0.1:4001
Environment=API_INTERNAL_PORT=4001
Environment=NODE_ENV=production
Environment=PATH=/home/stagingga/.nvm/versions/node/v20.20.2/bin:/usr/bin:/bin
ExecStart=/home/stagingga/.nvm/versions/node/v20.20.2/bin/node scripts/hostinger-combined-start.mjs
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SVCEOF

mkdir -p /etc/apache2/conf.d/userdata/ssl/2_4/stagingga/test.staging.glassassistuk.co.uk
cat > /etc/apache2/conf.d/userdata/ssl/2_4/stagingga/test.staging.glassassistuk.co.uk/inventory_proxy.conf << PXEOF
ProxyPreserveHost On
ProxyPass / http://127.0.0.1:\$APP_PORT/
ProxyPassReverse / http://127.0.0.1:\$APP_PORT/
PXEOF

mkdir -p /etc/apache2/conf.d/userdata/std/2_4/stagingga/test.staging.glassassistuk.co.uk
cp /etc/apache2/conf.d/userdata/ssl/2_4/stagingga/test.staging.glassassistuk.co.uk/inventory_proxy.conf \\
   /etc/apache2/conf.d/userdata/std/2_4/stagingga/test.staging.glassassistuk.co.uk/inventory_proxy.conf

/usr/local/cpanel/scripts/rebuildhttpdconf
/usr/local/cpanel/scripts/restartsrv_httpd

systemctl daemon-reload
systemctl enable inventory-test
systemctl restart inventory-test
sleep 8
systemctl is-active inventory-test
curl -sS -o /dev/null -w \"local:%{http_code}\" http://127.0.0.1:\$APP_PORT/login || true
echo
"

echo "✅ Done: $APP_URL"
