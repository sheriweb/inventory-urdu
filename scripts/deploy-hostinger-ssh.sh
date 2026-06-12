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
RSYNC_OPTS=(
  -az --delete
  --exclude node_modules
  --exclude .git
  --exclude uploads
  --exclude deploy/secrets.env
  --exclude deploy/hostinger-production.env
  --exclude .npm-cache
  --exclude .env
  --exclude 'tmp/api.log'
  --exclude 'tmp/api.env'
  --exclude 'tmp/restart.txt'
  --exclude 'tmp/api-dist.tgz'
  --exclude 'tmp/*.tgz'
  --exclude 'tmp/api-manual*.log'
  --exclude 'tmp/manual-web.log'
  --exclude 'apps/web/.next/static/chunks'
)

upload_ok=0
for attempt in 1 2 3 4 5; do
  if sshpass -e rsync "${RSYNC_OPTS[@]}" \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/" "$SSH_USER@$SSH_HOST:$SSH_REMOTE_PATH/"; then
    upload_ok=1
    break
  fi
  echo "⚠ rsync attempt $attempt failed — server may be at resource limit, retry in 30s…"
  sleep 30
done

if [[ "$upload_ok" != "1" ]]; then
  echo "❌ Upload failed after 5 attempts. Disable hPanel Git redeploy and wait for resource limits to reset."
  exit 1
fi

echo "▶ Syncing new JS/CSS chunks (merge, keep old chunks until CDN/browsers refresh)…"
for attempt in 1 2 3; do
  if sshpass -e rsync -az \
    -e "ssh ${SSH_OPTS[*]}" \
    "$ROOT/apps/web/.next/static/" "$SSH_USER@$SSH_HOST:$SSH_REMOTE_PATH/apps/web/.next/static/"; then
    break
  fi
  sleep 15
done

echo "▶ Server post-deploy…"
ssh_cmd "cd '$SSH_REMOTE_PATH' && \
  export DATABASE_URL='$DATABASE_URL' && \
  export RUN_DB_SETUP='${RUN_DB_SETUP:-0}' && \
  bash scripts/post-deploy-hostinger.sh"

echo "✅ Deploy complete — https://qistpro.shop"
