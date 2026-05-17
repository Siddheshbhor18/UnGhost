#!/usr/bin/env bash
# Post-deploy smoke test. Run after every staging + prod deploy.
# Fails fast (exit 1) on any check so CI can auto-rollback.
#
# Usage: ./scripts/smoke.sh https://staging.unghost.com
set -euo pipefail

BASE="${1:-http://localhost:3000}"
echo "smoke: $BASE"

# 1. Health endpoint must be 200 + ok=true + mongo+redis reachable.
echo "  [1/5] health…"
HEALTH=$(curl -fsS "$BASE/api/health")
echo "$HEALTH" | jq -e '.ok == true' >/dev/null
echo "$HEALTH" | jq -e '.checks.mongo.ok == true' >/dev/null
echo "$HEALTH" | jq -e '.checks.redis.ok == true' >/dev/null

# 2. Public landing renders.
echo "  [2/5] landing…"
curl -fsS "$BASE/" | grep -q -i "unghost"

# 3. Login page renders.
echo "  [3/5] login page…"
curl -fsS "$BASE/login" | grep -q -i "Welcome back"

# 4. CSRF endpoint (NextAuth) responds.
echo "  [4/5] csrf endpoint…"
curl -fsS "$BASE/api/auth/csrf" | jq -e '.csrfToken' >/dev/null

# 5. Version header matches the deployed SHA (if set).
echo "  [5/5] version header…"
HEAD=$(curl -fsSI "$BASE/api/health")
echo "$HEAD" | grep -qi "^x-app-version:" || {
  echo "    WARN: x-app-version header missing"
  exit 1
}

echo "smoke: OK"
