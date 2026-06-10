#!/usr/bin/env bash
# FTP servers reject symlinks — copy node_modules with symlinks resolved to real files.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy-flat/node_modules"

rm -rf "$ROOT/deploy-flat"
mkdir -p "$OUT"

echo "▶ Flattening node_modules for FTP (no symlinks)…"
rsync -aL "$ROOT/node_modules/" "$OUT/"
echo "✅ Flat node_modules ready: $(du -sh "$OUT" | cut -f1)"
