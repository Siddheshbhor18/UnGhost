#!/usr/bin/env bash
# One-time setup: authenticate with Vercel + link this checkout to your
# project. Run from the repo root. Creates `.vercel/project.json` which is
# gitignored and account-specific (carries your orgId + projectId).
#
# After this, every other Vercel CLI command in this dir works without
# prompting for project selection.

set -euo pipefail

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ vercel CLI not found."
  echo "   Install it globally: npm i -g vercel"
  echo "   …or run via npx: npx vercel link"
  exit 1
fi

echo "▶ Checking Vercel auth…"
if ! vercel whoami >/dev/null 2>&1; then
  echo "  Not logged in. Opening browser for vercel login…"
  vercel login
fi
# Vercel CLI v54+ writes .vercel/repo.json (newer monorepo-aware format);
# earlier CLI versions wrote .vercel/project.json. Either is a valid link.
LINK_FILE=""
if [ -f .vercel/repo.json ]; then
  LINK_FILE=.vercel/repo.json
elif [ -f .vercel/project.json ]; then
  LINK_FILE=.vercel/project.json
fi

if [ -n "$LINK_FILE" ]; then
  echo "▶ Already linked. Current link ($LINK_FILE):"
  cat "$LINK_FILE"
  echo
  read -rp "Re-link to a different project? [y/N] " RELINK
  if [[ ! "$RELINK" =~ ^[Yy]$ ]]; then
    echo "  No changes. Done."
    exit 0
  fi
fi

echo "▶ Linking this checkout to a Vercel project…"
echo "  (Pick your scope, then your project. Default settings are fine.)"
vercel link

echo
echo "✅ Linked. .vercel/project.json created (gitignored)."
echo
echo "Next steps:"
echo "  - Pull production env vars locally: npm run vercel:env:pull"
echo "  - Add Razorpay live keys + webhook secret: bash scripts/vercel-razorpay-setup.sh"
echo "  - List all env vars: npm run vercel:env:ls"
echo "  - Tail production logs: npm run vercel:logs"
