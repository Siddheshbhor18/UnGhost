# Runbook — rollback

## When to roll back

Roll back when the most recent deploy is the cause of an active incident. Symptoms:

- Sentry error rate >2× baseline for 5+ minutes
- `/api/health` returning 503 across multiple regions
- p95 latency above 1.5s sustained for 5+ minutes
- Any SEV1 incident where the recent deploy is plausible

Do **not** roll back if the cause is upstream (Mongo Atlas outage, MSG91 down, etc.) — that needs provider-side action, not a code revert.

## How to roll back

### Application (1-command, <90 seconds)

```bash
# Roll prod to the previous image
npx wrangler containers rollback unghost-prod
```

Or pin to a specific known-good SHA:
```bash
npx wrangler containers deploy --name=unghost-prod --image=...:v1.4.2
```

Watch `/api/health` come back green:
```bash
watch -n 5 'curl -fsS https://www.unghost.com/api/health | jq .ok'
```

### Database migration (rare, destructive)

Only if a migration introduced the regression AND its `down` step is safe.

```bash
MONGODB_URI=$PROD_URI npm run migrate:down -- --count=1
```

If the migration **added** an index → `down` drops it (safe).
If the migration **changed schema** → review the `down` body before running. Manual data restore from PITR may be safer.

## After the rollback

1. Post incident summary to #engineering + #prod Slack channels.
2. Open GitHub issue with `incident` label.
3. Schedule a post-mortem within 48 hours.
4. Update this runbook if any step was unclear or missing.

## Anti-patterns (don't do these)

- **Don't re-deploy the bad image** "to confirm the bug". Confirm in preview env or by inspecting logs/Sentry.
- **Don't roll back DB migrations on every app rollback**. App rollback is reversible (deploy again); migrations often aren't.
- **Don't skip the smoke test** after rollback. Auto-rollback re-runs `scripts/smoke.sh`. If smoke fails, page on-call — both the new and old images are broken.
