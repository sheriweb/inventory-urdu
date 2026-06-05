#!/usr/bin/env bash
# FTP upload done? Run this — API token ho to auto Node deploy, warna hPanel steps print.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS="$ROOT/deploy/secrets.env"
DOMAIN="${HOSTINGER_DOMAIN:-paleturquoise-stork-447573.hostingersite.com}"

echo "=== Inventory Urdu — Go Live ==="

bash "$ROOT/scripts/create-deploy-zip.sh"

if [[ -f "$SECRETS" ]]; then
  # shellcheck disable=SC1090
  source "$SECRETS"
  if [[ -n "${FTP_HOST:-}" && -n "${FTP_USER:-}" && -n "${FTP_PASSWORD:-}" ]]; then
    echo "Uploading production.env + ZIP to server…"
    lftp -u "$FTP_USER","$FTP_PASSWORD" "ftp://${FTP_HOST:-21}" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
put "$ROOT/deploy/hostinger-production.env" -o production.env
put "$(ls -t "$ROOT"/deploy/inventory-urdu_*.zip | head -1)" -o inventory-urdu-deploy.zip
bye
EOF
    echo "✅ production.env + inventory-urdu-deploy.zip on server"
  fi

  if [[ -n "${HOSTINGER_API_TOKEN:-}" ]]; then
    echo "HOSTINGER_API_TOKEN found — triggering Node.js deploy via API…"
    cd "$ROOT"
    npm install axios tus-js-client --no-save 2>/dev/null || npm install axios tus-js-client
    export HOSTINGER_DOMAIN="$DOMAIN"
    node scripts/hostinger-deploy.mjs
    echo "✅ API deploy triggered — check hPanel build logs"
    exit 0
  fi
fi

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  FTP ✅ — Ab sirf hPanel Node.js setup (5 min)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. https://hpanel.hostinger.com → Websites → Node.js → Get started
2. Domain: $DOMAIN
3. File upload → inventory-urdu-deploy.zip
   (server par pehle se hai, ya local: deploy/inventory-urdu_*.zip)
4. Build settings:
   - Node.js: 20
   - Install: npm ci --include=dev
   - Build:  npm run hostinger:build
   - Start:  npm run hostinger:start
5. Environment variables → Import from .env → production.env
   (server par upload ho chuka, ya local: deploy/hostinger-production.env)
6. Deploy → wait ~5-10 min
7. Jab site chal jaye: hPanel se RUN_DB_SETUP hata dein + redeploy

Login: admin@sheriweb.com / (SUPER_ADMIN_PASSWORD from production.env)

API auto-deploy ke liye: deploy/secrets.env mein HOSTINGER_API_TOKEN add karein
EOF
