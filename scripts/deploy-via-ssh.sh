#!/usr/bin/env bash
# Build locally/CI, upload via SSH/rsync, sync DB schema, restart Node app.
# GitHub Actions: secrets SSH_HOST, SSH_PORT, SSH_USER, SSH_PASSWORD, DATABASE_URL
# Local: deploy/secrets.env (optional) or export vars manually
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

SSH_HOST="${SSH_HOST:?SSH_HOST required}"
SSH_PORT="${SSH_PORT:-65002}"
SSH_USER="${SSH_USER:?SSH_USER required}"
SSH_PASSWORD="${SSH_PASSWORD:?SSH_PASSWORD required}"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL required}"
SSH_REMOTE_PATH="${SSH_REMOTE_PATH:-/home/u938549775/domains/hotpink-tarsier-652805.hostingersite.com/nodejs}"
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
if [[ ! -d "$OUT" ]]; then
  echo "Missing $OUT — run build first"
  exit 1
fi

echo "▶ Uploading to $SSH_USER@$SSH_HOST:$SSH_REMOTE_PATH …"
rsync_upload "$OUT"

echo "▶ Installing deps + syncing database + restart…"
# shellcheck disable=SC2016
ssh_cmd "export PATH=/opt/alt/alt-nodejs20/root/usr/bin:\$PATH
cd '$SSH_REMOTE_PATH'
npm ci --ignore-scripts --prefer-offline --no-audit --no-fund
cd apps/api
export DATABASE_URL='$DATABASE_URL'
node ../../node_modules/prisma/build/index.js generate
node ../../node_modules/prisma/build/index.js db push --skip-generate
cd '$SSH_REMOTE_PATH'
touch tmp/restart.txt
echo '✅ Deploy complete — app restarting'"

echo "✅ Done: https://hotpink-tarsier-652805.hostingersite.com"
