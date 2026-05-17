# Cloudflare bootstrap checklist

Runbook for first-time setup. Run top-to-bottom once per environment. Re-runs are safe — every step is idempotent.

## Prerequisites

- Cloudflare account with billing enabled (Pro plan, ~$25/month)
- Domain registered or transferred to Cloudflare
- MongoDB Atlas account
- Upstash account
- Sentry org + Slack workspace (Sprint B Day 5 setup)
- GitHub repo with push access

## 1. Cloudflare account preparation

1. Subscribe to **Cloudflare Pro** ($25/month). Required for WAF managed rules + image optimisation.
2. Add domain `unghost.com`. Verify nameservers.
3. Enable in dashboard:
   - SSL/TLS → Full (strict)
   - Always Use HTTPS → ON
   - Automatic HTTPS Rewrites → ON
   - WAF managed rules → "Cloudflare Managed Ruleset" enabled
   - Bot Fight Mode → ON
4. **DNS records** (Cloudflare proxy ON for all):
   ```
   A     @           → cloudflare-containers-app-prod
   CNAME www         → @
   CNAME staging     → cloudflare-containers-app-staging
   CNAME preview-*   → cloudflare-containers-app-preview  (wildcard, prod-only)
   CNAME status      → status-page-better-stack
   CNAME docs        → cloudflare-pages-docs
   ```
5. Create **API Token** with scopes:
   - Account → Cloudflare Containers: Edit
   - Account → Workers Scripts: Edit
   - Account → R2: Read+Write
   - Zone → DNS: Edit (zone: `unghost.com`)
   - Save token to **GitHub Secrets** as `CLOUDFLARE_API_TOKEN`.

## 2. Cloudflare R2 buckets

```bash
# Run with the Cloudflare API token from step 1.5 in env.
wrangler r2 bucket create unghost-uploads
wrangler r2 bucket create unghost-uploads-staging
wrangler r2 bucket create unghost-uploads-preview
```

Per bucket:
- Enable public read on a CNAME-fronted subdomain (`uploads.unghost.com` → bucket).
- Object lifecycle: delete preview-bucket objects after 7 days.

Generate **Access Key ID + Secret** in R2 dashboard → Manage R2 API tokens.

## 3. MongoDB Atlas

1. Create Project `unghost-prod`. Region **Mumbai (ap-south-1)**. Tier **M30**.
2. Create cluster `unghost-prod-0`. Enable continuous backup (PITR, 7-day retention).
3. Create databases:
   - `unghost_production`
   - `unghost_staging`
4. Create three database users (Database Access → Add):
   - `app-rw` → readWrite on production + staging
   - `migrator` → dbAdmin on production + staging (DDL only — used by CI migration step)
   - `readonly` → read on production (analytics, future)
5. Network Access → **only allow Cloudflare Container egress IPs**. Atlas exposes these per project. For staging-from-laptop testing, add your IP temporarily.
6. Slow-query profiler:
   - Performance Advisor → enable
   - Set alert: query >500ms → Slack webhook `SLACK_WEBHOOK_ENGINEERING`
   - Set alert: query >2s → PagerDuty (when wired)
7. Connection string format for env:
   ```
   MONGODB_URI=mongodb+srv://app-rw:<password>@unghost-prod-0.xxxxx.mongodb.net/unghost_production?retryWrites=true&w=majority
   ```

## 4. Upstash Redis

1. Create database `unghost-prod`. Region **ap-south-1 (Mumbai)**. TLS only.
2. Eviction policy: `allkeys-lru`. Max memory: 1 GB.
3. Take the **REST URL** + **REST token** (NOT the Redis URI — we use the REST adapter so Cloudflare Containers can reach it without TCP).
4. Set in Cloudflare env:
   ```
   UPSTASH_REDIS_REST_URL=https://....upstash.io
   UPSTASH_REDIS_REST_TOKEN=...
   ```
5. Repeat for `unghost-staging` (separate database, same region).

## 5. Cloudflare Containers project

```bash
# Build + push the image
docker build --platform=linux/amd64 \
  --build-arg APP_VERSION="$(git rev-parse --short HEAD)" \
  -t registry.cloudflare.com/<account-id>/unghost-app:$(git rev-parse --short HEAD) .

docker push registry.cloudflare.com/<account-id>/unghost-app:$(git rev-parse --short HEAD)
```

Create container apps:
```bash
wrangler containers create unghost-prod \
  --region=mum1 \
  --instances=3 \
  --cpu=1 --memory=1Gi

wrangler containers create unghost-staging \
  --region=mum1 \
  --instances=1 --cpu=0.5 --memory=512Mi
```

Bind environment variables (per env). The full list is in `.env.example`.

Bind a route in Cloudflare dashboard:
- `www.unghost.com/*` → `unghost-prod`
- `staging.unghost.com/*` → `unghost-staging`

## 6. First deploy

```bash
wrangler containers deploy unghost-staging \
  --image=registry.cloudflare.com/<account-id>/unghost-app:$(git rev-parse --short HEAD)

# After health check passes:
curl -fsS https://staging.unghost.com/api/health | jq .
```

Expected response:
```json
{
  "ok": true,
  "version": "<git-sha>",
  "environment": "production",
  "region": "mum1",
  "checks": {
    "mongo": { "ok": true, "latencyMs": <30 },
    "redis": { "ok": true, "latencyMs": <30, "mode": "upstash" }
  }
}
```

## 7. Migration on first deploy

After the staging container is up + reachable:
```bash
MONGODB_URI=mongodb+srv://migrator:...@<staging-cluster>/unghost_staging?... \
  npm run migrate:up
```

Verify with `npm run migrate:status` — both `applied` for the baseline-compound-indexes migration.

## 8. Smoke + 4-hour soak

After deploy:
```bash
./scripts/smoke.sh https://staging.unghost.com
```

Then let it run idle for 4 hours and watch:
- Better Stack uptime % (target: 100%)
- Sentry error rate (target: 0 errors)
- Atlas slow-query alerts (target: 0 alerts above threshold)
- Container CPU/memory (target: <30% baseline)

Sign-off: if all four green for 4 hours, advance to Sprint C Day 5.

## Rollback

```bash
wrangler containers rollback unghost-staging   # to previous image SHA
# or pin to a specific known-good
wrangler containers deploy unghost-staging --image=...:v1.4.2
```

Migration rollback (rare, destructive):
```bash
MONGODB_URI=$STAGING_URI npm run migrate:down -- --count=1
```
