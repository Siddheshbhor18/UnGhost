#!/usr/bin/env bash
# Interactive setup of the 4 Razorpay env vars in Vercel Production scope.
# Pastes each value via stdin so it NEVER lands in shell history.
# Re-runs are safe — Vercel will prompt to overwrite if the var already exists.
#
# Prereqs:
#   1. bash scripts/vercel-link.sh  (one-time)
#   2. You have your live Razorpay keys + the webhook secret you generated.
#
# After this script, you MUST redeploy production for the new vars to take
# effect (Vercel does NOT auto-redeploy on env changes).

set -euo pipefail

# Vercel CLI v54+ writes repo.json; older versions wrote project.json.
if [ ! -f .vercel/repo.json ] && [ ! -f .vercel/project.json ]; then
  echo "❌ Project not linked. Run: npm run vercel:link"
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ vercel CLI not found. Install: npm i -g vercel"
  exit 1
fi

echo "═══════════════════════════════════════════════════════════════"
echo "  Razorpay LIVE keys → Vercel Production env"
echo "═══════════════════════════════════════════════════════════════"
echo
echo "You'll paste 3 values. Get them from:"
echo "  - Key Id  + Key Secret : https://dashboard.razorpay.com/app/keys (Live Mode)"
echo "  - Webhook Secret       : the 64-char string you set when creating the"
echo "                           webhook at https://dashboard.razorpay.com/app/webhooks"
echo
echo "Values are read silently and piped to Vercel. They never echo to the"
echo "terminal and never enter your shell history."
echo

read -rp "▶ Continue? [y/N] " GO
if [[ ! "$GO" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi
echo

# Read each secret silently (-s) into a variable.
echo -n "Paste RAZORPAY_KEY_ID (starts with 'rzp_live_'): "
read -rs RZP_KEY_ID
echo
if [[ ! "$RZP_KEY_ID" =~ ^rzp_live_ ]]; then
  echo "⚠️  That doesn't look like a live key id (expected 'rzp_live_…')."
  read -rp "    Continue anyway? [y/N] " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then exit 1; fi
fi

echo -n "Paste RAZORPAY_KEY_SECRET (the secret shown ONCE in the dashboard): "
read -rs RZP_KEY_SECRET
echo

echo -n "Paste RAZORPAY_WEBHOOK_SECRET (the secret you typed when creating the webhook): "
read -rs RZP_WEBHOOK_SECRET
echo
if [ ${#RZP_WEBHOOK_SECRET} -lt 16 ]; then
  echo "⚠️  Webhook secret is shorter than 16 chars. The runbook recommends"
  echo "    'openssl rand -hex 32' (64 chars). Continue?"
  read -rp "    Continue anyway? [y/N] " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then exit 1; fi
fi

echo
echo "▶ Pushing to Vercel Production…"

# Push one env var to Vercel Production. Pattern:
#   - --sensitive          → marks the value as a secret (server-only on Vercel),
#                            ALSO suppresses the "Is this sensitive?" prompt that
#                            would otherwise eat our stdin value.
#   - --no-sensitive       → for the public key id (browser-readable).
#   - --force              → overwrites any existing value silently.
#   - --yes                → skips the "Confirm overwrite" prompt.
#   - printf '%s' "$value" | … → value via stdin (NOT --value, which would
#                                expose the secret in `ps` output).
push_env_secret() {
  local name="$1"
  local value="$2"
  printf '%s' "$value" \
    | vercel env add "$name" production --sensitive --force --yes >/dev/null
  echo "  ✓ $name (sensitive)"
}
push_env_public() {
  local name="$1"
  local value="$2"
  # NEXT_PUBLIC_* values aren't secret — pass via --value for clarity. Safe
  # because the value is already exposed in the browser bundle anyway.
  vercel env add "$name" production --value "$value" --no-sensitive --force --yes \
    >/dev/null
  echo "  ✓ $name (public)"
}

push_env_secret RAZORPAY_KEY_ID         "$RZP_KEY_ID"
push_env_secret RAZORPAY_KEY_SECRET     "$RZP_KEY_SECRET"
push_env_public NEXT_PUBLIC_RAZORPAY_KEY_ID "$RZP_KEY_ID"
push_env_secret RAZORPAY_WEBHOOK_SECRET "$RZP_WEBHOOK_SECRET"

# Wipe locals immediately.
unset RZP_KEY_ID RZP_KEY_SECRET RZP_WEBHOOK_SECRET

echo
echo "✅ All 4 env vars set in Production scope."
echo
echo "NEXT — production must redeploy to pick these up. Pick one:"
echo "  a) Commit a noop:   git commit --allow-empty -m 'chore: rollout razorpay live' && git push"
echo "  b) From terminal:   npm run vercel:deploy:prod"
echo "  c) From dashboard:  Vercel → Deployments → latest prod → ⋯ → Redeploy"
echo
echo "Verify it took:"
echo "  npm run vercel:env:ls         # confirm the 4 keys are listed"
echo "  npm run vercel:logs           # tail prod logs"
