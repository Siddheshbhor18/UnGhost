# Runbook — go-live

The day you flip production from invite-only to public. Read this top-to-bottom 48 hours before. Print it.

## T-1 day (Sunday or Monday morning)

- [ ] Confirm all integrations show **Live** in `/admin/integrations`.
- [ ] Confirm `npm run migrate:status` shows the baseline migration applied to prod.
- [ ] Confirm DNS records in Cloudflare: `www.unghost.com` → prod container, `staging.unghost.com` → staging.
- [ ] Confirm Cloudflare SSL/TLS = Full (strict), HSTS preload pending.
- [ ] Confirm Mongo Atlas backup PITR enabled, snapshot retention 7d.
- [ ] Confirm Upstash Redis prod database max-memory 1GB, eviction `allkeys-lru`.
- [ ] Confirm Better Stack uptime monitor pointed at `https://www.unghost.com/api/health`, 30s interval.
- [ ] Confirm Slack webhooks alive — send a test message to each channel.
- [ ] Confirm Sentry release tracking working — last 3 deploys have linked commits.
- [ ] Confirm payments-side onboarding — PhonePe merchant agreement signed, live keys received.
- [ ] Run `k6 run --vus 10000 --duration 10m tests/load/k6.peak.js -e BASE_URL=https://staging.unghost.com`.
  - Acceptance: error rate < 0.1%, p95 < 800ms. Hard stop if either misses.
- [ ] Go/no-go meeting with tech lead + founder + product. 30 min, recorded.

## T-0 morning (launch day)

- [ ] Tag the release: `git tag -a v1.0.0 -m "Public launch"` then `git push --tags`.
- [ ] CI deploys to prod automatically. Approve in GitHub Environments → production.
- [ ] Watch smoke output. If it fails, auto-rollback fires; investigate before retry.
- [ ] After smoke green:
  - [ ] Atlas → confirm app-rw user has expected query volume (not 0, not spiking).
  - [ ] Sentry → 0 errors in the first 60s after rollout.
  - [ ] `/api/health` from 3 geo locations returns 200 with mode=live for all adapters.
- [ ] Remove the invite-only middleware gate (if one was in place).
- [ ] Flip the landing page CTA to non-waitlist copy.
- [ ] Post to #prod Slack: `🚀 unGhost is live · ${VERSION}`.
- [ ] Update `status.unghost.com` description to "Operational".
- [ ] Tweet (optional, founder owns timing).

## T+1 to T+5 days

- [ ] Hourly health-dashboard sweep first 24h, every 4h next 4d.
- [ ] Daily metrics review at end of day:
  - Active users, sign-up count, application count
  - SLA breach refund count (should be ≤ industry baseline)
  - Sentry top errors
  - p95 latency trend
  - Atlas slow-query list
- [ ] First 24h on-call rotation = founder + tech lead.
- [ ] Open a post-launch retro doc; add notes as you go.

## When to rollback (post-launch)

Same triggers as `rollback.md`. The first 72 hours are the riskiest — be quick to roll back, slow to ship hotfixes. A 30-minute outage is better than a half-fixed deploy.

## Communication channels

- **#prod** — deploy + launch announcements
- **#incidents** — live tick-tock if something breaks
- **status.unghost.com** — public-facing status page
- **support@unghost.com** — customer email channel
