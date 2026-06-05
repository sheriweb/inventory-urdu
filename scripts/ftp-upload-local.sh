#!/usr/bin/env bash
# Local FTP/FTPS upload to Hostinger (works from your PC; GitHub cloud IPs often blocked on port 21).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRETS="$ROOT/deploy/secrets.env"

if [[ ! -f "$SECRETS" ]]; then
  echo "Missing $SECRETS"
  exit 1
fi

# shellcheck disable=SC1090
source "$SECRETS"

HOST="${FTP_HOST:?}"
USER="${FTP_USER:?}"
PASS="${FTP_PASSWORD:?}"
PORT="${FTP_PORT:-21}"
REMOTE="${FTP_ROOT:-.}"
LOCAL="${1:-$ROOT/deploy-output}"
ZIP="${2:-}"

if [[ ! -d "$LOCAL" ]]; then
  echo "Run: npm run hostinger:build && bash scripts/prepare-ftp-deploy.sh"
  exit 1
fi

echo "Uploading $LOCAL → $HOST:$REMOTE/ …"

lftp -u "$USER","$PASS" "ftp://$HOST:$PORT" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
set net:timeout 60
set net:max-retries 3
cd $REMOTE
mirror -R --parallel=4 --verbose "$LOCAL" .
bye
EOF

if [[ -n "$ZIP" && -f "$ZIP" ]]; then
  echo "Uploading ZIP: $ZIP"
  lftp -u "$USER","$PASS" "ftp://$HOST:$PORT" <<EOF
set ftp:ssl-allow true
set ssl:verify-certificate no
cd $REMOTE
put "$ZIP"
bye
EOF
fi

echo "✅ FTP upload done"
