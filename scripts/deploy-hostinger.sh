#!/usr/bin/env bash
# Deploy inventory-urdu to Hostinger via API (needs HOSTINGER_API_TOKEN in deploy/secrets.env)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/deploy/secrets.env" ]]; then
  # shellcheck disable=SC1090
  source "$ROOT/deploy/secrets.env"
fi

DOMAIN="${HOSTINGER_DOMAIN:-paleturquoise-stork-447573.hostingersite.com}"
API_TOKEN="${HOSTINGER_API_TOKEN:-}"

if [[ -z "$API_TOKEN" || "$API_TOKEN" == *"__FILL_ME__"* ]]; then
  echo "❌ HOSTINGER_API_TOKEN missing in deploy/secrets.env"
  echo "   hPanel → Profile → API → Create token"
  echo "   Then add: HOSTINGER_API_TOKEN=your_token"
  exit 1
fi

bash "$ROOT/scripts/create-deploy-zip.sh"
ZIP="$(ls -t "$ROOT/deploy"/inventory-urdu_*.zip | head -1)"

echo "📦 Deploying $ZIP to $DOMAIN …"

if ! command -v npx &>/dev/null; then
  echo "❌ npx required"
  exit 1
fi

# Use Hostinger MCP CLI if available
npx --yes hostinger-api-mcp@latest --help >/dev/null 2>&1 || true

echo ""
echo "Manual API deploy steps:"
echo "1. hPanel → Websites → paleturquoise → Node.js (or Add Website → Node.js)"
echo "2. Connect GitHub repo: sheriweb/inventory-urdu"
echo "3. Build: npm run hostinger:build | Start: npm run hostinger:start"
echo "4. Upload env file: deploy/hostinger-production.env"
echo "5. Or upload ZIP: $ZIP"
echo ""
echo "ZIP ready at: $ZIP"
