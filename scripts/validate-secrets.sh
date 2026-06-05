#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS="$ROOT/deploy/secrets.env"

if [[ ! -f "$SECRETS" ]]; then
  echo "❌ deploy/secrets.env not found."
  echo "   Run: cp deploy/secrets.template.env deploy/secrets.env"
  exit 1
fi

# shellcheck disable=SC1090
source "$SECRETS"

MISSING=()
check() {
  local key="$1"
  local val="${!key:-}"
  if [[ -z "$val" || "$val" == *"__FILL_ME__"* || "$val" == *"YOUR_"* ]]; then
    MISSING+=("$key")
  fi
}

for key in \
  GITHUB_REPO_URL GITHUB_BRANCH GITHUB_TOKEN \
  WEB_URL API_URL \
  DB_NAME DB_USER DB_PASSWORD DATABASE_URL \
  JWT_ACCESS_SECRET JWT_REFRESH_SECRET \
  SUPER_ADMIN_EMAIL SUPER_ADMIN_PASSWORD \
  NEXT_PUBLIC_API_URL; do
  check "$key"
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "❌ These secrets are missing or still have placeholders:"
  printf '   - %s\n' "${MISSING[@]}"
  exit 1
fi

echo "✅ deploy/secrets.env looks complete."
