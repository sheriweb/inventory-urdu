#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/validate-secrets.sh"

# shellcheck disable=SC1090
source "$ROOT/deploy/secrets.env"

BRANCH="${GITHUB_BRANCH:-main}"

if [[ ! -d .git ]]; then
  git init
  git branch -M "$BRANCH"
fi

if ! git remote get-url origin &>/dev/null; then
  git remote add origin "$GITHUB_REPO_URL"
else
  git remote set-url origin "$GITHUB_REPO_URL"
fi

git add -A

if ! git diff --cached --quiet; then
  git commit -m "$(cat <<'EOF'
Add Hostinger deployment setup and production build scripts.
EOF
)"
fi

REPO_PATH="${GITHUB_REPO_URL#https://github.com/}"
REPO_PATH="${REPO_PATH%.git}"
PUSH_URL="https://${GITHUB_TOKEN}@github.com/${REPO_PATH}.git"

echo "📤 Pushing to github.com/${REPO_PATH} (${BRANCH})…"
git push -u "$PUSH_URL" "$BRANCH"

echo "✅ Git push complete."
