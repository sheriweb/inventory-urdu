#!/usr/bin/env bash
# FTP cannot use symlinks. Never follow @inventory-urdu/api|web|admin — they embed apps/ + .next.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy-flat/node_modules"

rm -rf "$ROOT/deploy-flat"
mkdir -p "$OUT"

echo "▶ Copying runtime node_modules (excluding workspace app symlinks)…"

copy_entry() {
  local src="$1"
  local dest="$2"
  mkdir -p "$(dirname "$dest")"
  rsync -aL "$src/" "$dest/"
}

for entry in "$ROOT/node_modules"/*; do
  base="$(basename "$entry")"
  case "$base" in
    @inventory-urdu|.package-lock.json|.cache) continue ;;
  esac
  if [[ "$base" == @* ]]; then
    scope="${base#@}"
    for scoped in "$ROOT/node_modules/@$scope"/*; do
      [[ -e "$scoped" ]] || continue
      name="$(basename "$scoped")"
      copy_entry "$scoped" "$OUT/@$scope/$name"
    done
  else
    copy_entry "$entry" "$OUT/$base"
  fi
done

mkdir -p "$OUT/@inventory-urdu/shared"
rsync -a "$ROOT/packages/shared/" "$OUT/@inventory-urdu/shared/" \
  --exclude node_modules --exclude src

echo "✅ Runtime node_modules: $(du -sh "$OUT" | cut -f1)"
