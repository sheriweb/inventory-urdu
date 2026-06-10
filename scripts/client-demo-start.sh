#!/usr/bin/env bash
# Mac demo — ek terminal mein chalao, band mat karo.
# Stable fixed URL: https://hotpink-tarsier-652805.hostingersite.com (Hostinger)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo ""
echo "▶ Demo start ho rahi hai — is terminal ko BAND mat karo."
echo "▶ Fixed URL (server): https://hotpink-tarsier-652805.hostingersite.com"
echo ""
exec node "$ROOT/scripts/demo-keepalive.mjs"
