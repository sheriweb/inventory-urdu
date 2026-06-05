#!/usr/bin/env bash
# Prints Hostinger environment variables from secrets.env for copy-paste into hPanel.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS="$ROOT/deploy/secrets.env"

if [[ ! -f "$SECRETS" ]]; then
  echo "Copy deploy/secrets.template.env → deploy/secrets.env first."
  exit 1
fi

# shellcheck disable=SC1090
source "$SECRETS"

CORS="${CORS_ORIGINS:-$WEB_URL}"

echo "========== API APP — Environment Variables =========="
cat <<EOF
NODE_ENV=production
DATABASE_URL=${DATABASE_URL}
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRATION=${JWT_ACCESS_EXPIRATION:-15m}
JWT_REFRESH_EXPIRATION=${JWT_REFRESH_EXPIRATION:-7d}
API_PREFIX=${API_PREFIX:-api/v1}
CORS_ORIGINS=${CORS}
SUPER_ADMIN_EMAIL=${SUPER_ADMIN_EMAIL}
SUPER_ADMIN_PASSWORD=${SUPER_ADMIN_PASSWORD}
SUPER_ADMIN_NAME=${SUPER_ADMIN_NAME:-Super Admin}
EOF

echo ""
echo "========== WEB + API (combined) — extra env =========="
cat <<EOF
NODE_ENV=production
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
HOSTINGER_COMBINED=1
INTERNAL_API_URL=${INTERNAL_API_URL:-http://127.0.0.1:4001}
API_INTERNAL_PORT=${API_INTERNAL_PORT:-4001}
EOF

echo ""
echo "========== Hostinger Build/Start (combined — one site) =========="
echo "Install: npm ci"
echo "Build:   npm run hostinger:build"
echo "Start:   npm run hostinger:start"
