#!/usr/bin/env bash
# Backup deploy: CI/local build → rsync → prisma db push on server.
# Primary deploy: Hostinger hPanel Git (auto on git push).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS="$ROOT/deploy/secrets.env"

_PRESET_DATABASE_URL="${DATABASE_URL:-}"
if [[ -f "$SECRETS" ]]; then
  # shellcheck disable=SC1090
  source "$SECRETS"
fi
[[ -n "$_PRESET_DATABASE_URL" ]] && DATABASE_URL="$_PRESET_DATABASE_URL"

SSH_HOST="${SSH_HOST:?Set SSH_HOST secret or deploy/secrets.env}"
SSH_PORT="${SSH_PORT:-65002}"
SSH_USER="${SSH_USER:?Set SSH_USER secret or deploy/secrets.env}"
SSH_PASSWORD="${SSH_PASSWORD:?Set SSH_PASSWORD secret or deploy/secrets.env}"
DATABASE_URL="${DATABASE_URL:?Set DATABASE_URL secret or deploy/secrets.env}"
SSH_REMOTE_PATH="${SSH_REMOTE_PATH:-/home/u938549775/domains/qistpro.shop/nodejs}"

SSH_OPTS=(-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -p "$SSH_PORT")
export SSHPASS="$SSH_PASSWORD"

ssh_cmd() {
  sshpass -e ssh "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST" "$@"
}

echo "▶ Building locally…"
cd "$ROOT"
npm ci
HOSTINGER_COMBINED=1 INTERNAL_API_URL=http://127.0.0.1:4001 \
  NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://qistpro.shop/api/v1}" \
  npm run hostinger:build

echo "▶ Uploading to $SSH_USER@$SSH_HOST:$SSH_REMOTE_PATH …"
sshpass -e rsync -az \
  -e "ssh ${SSH_OPTS[*]}" \
  --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude uploads \
  --exclude deploy/secrets.env \
  --exclude .npm-cache \
  "$ROOT/" "$SSH_USER@$SSH_HOST:$SSH_REMOTE_PATH/"

echo "▶ Server: install deps, sync DB…"
ssh_cmd "cd '$SSH_REMOTE_PATH' && \
  npm ci --omit=dev --no-audit --no-fund && \
  npm run db:generate -w @inventory-urdu/api && \
  cd apps/api && \
  export DATABASE_URL='$DATABASE_URL' && \
  node ../../node_modules/prisma/build/index.js db push --skip-generate && \
  echo '✅ SSH deploy complete — restart app from hPanel if needed'"
