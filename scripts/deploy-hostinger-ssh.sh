#!/usr/bin/env bash
# GitHub Actions / local: build on CI machine → rsync to Hostinger → post-deploy on server.
# Build runs on GitHub (not Hostinger) to avoid resource limit errors.
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
SSH_REMOTE_PATH="${SSH_REMOTE_PATH:-/home/u972626041/domains/qistpro.shop/nodejs}"

SSH_OPTS=(-o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -p "$SSH_PORT")
export SSHPASS="$SSH_PASSWORD"

ssh_cmd() {
  sshpass -e ssh "${SSH_OPTS[@]}" "$SSH_USER@$SSH_HOST" "$@"
}

cd "$ROOT"

if [[ "${SKIP_LOCAL_BUILD:-0}" != "1" ]]; then
  echo "▶ Building on CI (not on Hostinger)…"
  npm ci
  HOSTINGER_COMBINED=1 INTERNAL_API_URL=http://127.0.0.1:4001 \
    NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://qistpro.shop/api/v1}" \
    npm run hostinger:build
else
  echo "▶ Skipping build (SKIP_LOCAL_BUILD=1)"
fi

echo "▶ Uploading to $SSH_USER@$SSH_HOST:$SSH_REMOTE_PATH …"
sshpass -e rsync -az --delete \
  -e "ssh ${SSH_OPTS[*]}" \
  --exclude node_modules \
  --exclude .git \
  --exclude uploads \
  --exclude deploy/secrets.env \
  --exclude deploy/hostinger-production.env \
  --exclude .npm-cache \
  --exclude '.env' \
  --exclude 'tmp/api.log' \
  --exclude 'tmp/api.env' \
  --exclude 'tmp/restart.txt' \
  --exclude 'tmp/api-dist.tgz' \
  --exclude 'tmp/*.tgz' \
  --exclude 'tmp/api-manual*.log' \
  --exclude 'tmp/manual-web.log' \
  "$ROOT/" "$SSH_USER@$SSH_HOST:$SSH_REMOTE_PATH/"

echo "▶ Server post-deploy…"
ssh_cmd "cd '$SSH_REMOTE_PATH' && \
  export DATABASE_URL='$DATABASE_URL' && \
  export RUN_DB_SETUP='${RUN_DB_SETUP:-0}' && \
  bash scripts/post-deploy-hostinger.sh"

echo "✅ Deploy complete — https://qistpro.shop"
