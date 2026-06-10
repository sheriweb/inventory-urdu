#!/usr/bin/env bash
# Linux node_modules for cPanel (no SSH/npm on server). Requires Docker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null; then
  echo "Docker required. Install Docker Desktop or use cPanel → Setup Node.js App → Run NPM Install."
  exit 1
fi

echo "▶ Installing Linux node_modules in Docker (node:20-bookworm-slim)…"
docker run --rm \
  -v "$ROOT:/app" \
  -w /app \
  node:20-bookworm-slim \
  bash -lc 'rm -rf node_modules && npm ci --ignore-scripts --no-audit --no-fund && npm run db:generate -w @inventory-urdu/api'

echo "✅ Linux node_modules ready ($(du -sh node_modules | cut -f1))"
