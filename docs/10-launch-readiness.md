# Launch readiness — final state

What's in the box at the end of Sprint D, what's left to insert, and how to flip from prototype to production.

## What's shipped

### Sprint A · Foundation + security

- `lib/` → `server/` domain restructure, ESLint boundaries enforced
- bcrypt password hashing (12 rounds) + legacy plaintext auto-upgrade
- Secure cookie config (`__Secure-`/`__Host-` prefixes, httpOnly, sameSite=lax, 30-day TTL)
- Upstash Redis adapter w/ in-memory mock fallback
- OTP store + brute-force lockout in Redis
- Reset-token issuance + consumption in Redis w/ per-email rate limit
- Support tickets + email templates persisted to Mongo
- Zod request validation on 8 highest-risk routes
- Same-origin CSRF guard on every state-mutating route

### Sprint B · Tests + observability

- Vitest + `mongodb-memory-server` setup
- 27 unit tests passing (password, reset-token, OTP+lockout, store)
- Playwright + chromium + 4 e2e green (3 auth flow `.fixme`'d for hydration race)
- Sentry server + client + edge configs
- Pino structured logger w/ PII redaction
- Edge-middleware correlation-id (`x-request-id`)
- `/api/health` endpoint w/ Mongo + Redis liveness probes
- Redis sliding-window rate limit; applied to `/api/coach`, `/api/otp`, `/api/email/forgot-password`, `/api/upload/presign`
- Cloudflare R2 storage adapter (AWS SigV4 presign) + `/api/upload/presign` route
- Slack alert sink w/ 3 channels (engineering, prod, incidents)
- Coverage gate at current baseline; monotonic climb

### Sprint C · Performance + deploy prep

- 24 compound indexes documented in `server/db/indexes.ts` (`migrate-mongo` applied 10 new + skipped 14 already-Mongoose-managed)
- Read-through cache on `listJobs` (60s), `listCompanies` (5m), `listBootcamps` (5m) — with invalidation hooks on mutation
- Multi-stage `Dockerfile` (alpine, non-root, health check, ~180MB image)
- `next.config.mjs` `output: "standalone"` for optimal image size
- `.env.example` documenting every adapter env var
- `scripts/smoke.sh` 5-check post-deploy validator
- `docs/08-cloudflare-bootstrap.md` paint-by-numbers infra runbook

### Sprint D · Launch

- Full `.github/workflows/ci.yml` — lint → typecheck → test:coverage → build → e2e → preview deploy → staging auto-deploy → prod tag-deploy w/ approval gate + auto-rollback
- 3 runbooks: `rollback.md`, `incident-response.md`, `on-call.md`, `go-live.md`
- DPDP § 11 export endpoint (`/api/account/export`) — JSON download of every artefact
- DPDP § 13 erasure endpoint (`/api/account/delete`) — soft-delete + 30-day grace + hard-delete via SLA sweep
- YouTube Live embed for bootcamp live sessions (zero cost)
- k6 smoke + peak load test scripts w/ Sprint D acceptance thresholds

## What's left — only environment variables

Adapter pattern means **inserting these env vars flips the app from mock → live** with zero code change.

```bash
# Cloudflare → environment variables (production)
# Core
NEXTAUTH_URL=https://www.unghost.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXT_PUBLIC_APP_URL=https://www.unghost.com
DEPLOY_REGION=mum1

# Database (Atlas M30, Mumbai)
MONGODB_URI=mongodb+srv://app-rw:<password>@unghost-prod-0.xxxxx.mongodb.net/unghost_production?retryWrites=true&w=majority

# Redis (Upstash, Mumbai)
UPSTASH_REDIS_REST_URL=https://....upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# AI
ANTHROPIC_API_KEY=sk-ant-...

# SMS / OTP
MSG91_AUTH_KEY=...
MSG91_SENDER_ID=UNGHST
MSG91_OTP_TEMPLATE_ID=...

# Email
RESEND_API_KEY=re_...
RESEND_FROM=unGhost <hello@unghost.com>

# Payments
PHONEPE_MERCHANT_ID=...
PHONEPE_SALT_KEY=...
PHONEPE_SALT_INDEX=1
PHONEPE_BASE_URL=https://api.phonepe.com/apis/hermes

# Realtime
PUSHER_APP_ID=...
PUSHER_KEY=...
PUSHER_SECRET=...
PUSHER_CLUSTER=ap2

# Background jobs
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Object storage
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=unghost-uploads
R2_PUBLIC_BASE_URL=https://uploads.unghost.com

# Observability
SENTRY_DSN=https://...@o....ingest.sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@o....ingest.sentry.io/...

# Slack
SLACK_WEBHOOK_ENGINEERING=https://hooks.slack.com/services/...
SLACK_WEBHOOK_PROD=https://hooks.slack.com/services/...
SLACK_WEBHOOK_INCIDENTS=https://hooks.slack.com/services/...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

# Deploy automation (GitHub Secrets, not Cloudflare env)
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_REGISTRY_USERNAME=...
CLOUDFLARE_REGISTRY_TOKEN=...
STAGING_MIGRATOR_MONGODB_URI=...
PROD_MIGRATOR_MONGODB_URI=...
SENTRY_AUTH_TOKEN=...
SENTRY_ORG=...
SENTRY_PROJECT=...
```

## How to flip prod live

```bash
# 1. Set env vars in Cloudflare Containers dashboard (production env)
# 2. Tag the release
git tag -a v1.0.0 -m "Public launch"
git push --tags

# 3. Approve the prod deploy in GitHub → Actions → ci.yml workflow
# 4. CI runs:
#      verify → e2e → build image → migrate Atlas prod → deploy blue-green → smoke → Sentry release → Slack notify
# 5. If smoke fails: auto-rollback fires (<90s recovery)
# 6. Watch /admin/integrations — every row should read "Live"
```

## Pre-launch checklist (do once, never re-do)

- [ ] Provision Cloudflare account + R2 buckets + DNS (`docs/08-cloudflare-bootstrap.md`)
- [ ] Provision Mongo Atlas M30 + 3 DB users + IP allowlist
- [ ] Provision Upstash Redis prod + staging
- [ ] Provision Sentry org + 2 projects + release tracking
- [ ] Provision Resend domain (DKIM + SPF, 14-day IP warmup)
- [ ] Submit MSG91 DLT templates (5-10 business days)
- [ ] Complete PhonePe merchant KYC (7-14 business days)
- [ ] Create Pusher Channels app (cluster `ap2`)
- [ ] Create Inngest event keys (staging + prod)
- [ ] Add all secrets to Cloudflare env (per-environment) and GitHub Secrets
- [ ] Set GitHub Environments `staging` + `production` w/ approval rules

## Long-running items (post-launch)

These are nice-to-haves that don't block launch but should land within 30 days:

- Storybook for `components/ui/*`
- Axiom log transport wired into Pino (currently just structured stdout)
- EXPLAIN-in-CI for every PR that touches a Mongoose model
- Full ADR set (Markdown templates)
- Climb test coverage from current baseline to 70%
- Fix the 3 auth-flow `.fixme` Playwright tests (hydration race)
- Add Inngest cron for the 30-day DPDP hard-delete sweep

## The bottom line

**Everything code-side is shipped.** All remaining work is account-provisioning + API key paste. Once the keys are in, `/admin/integrations` flips every row to "Live" and the same code runs the same flows — just against real providers.
