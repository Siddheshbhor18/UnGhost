# Runbook — incident response

## Severity definitions

| Sev | Definition | Response |
|---|---|---|
| SEV1 | Production outage. Users cannot sign in, apply, or pay. | Page on-call now. Status page banner within 5 min. |
| SEV2 | Major degradation. Slow but recoverable. SLA-breach refund rate >5×. | Page on-call within 15 min. |
| SEV3 | One feature broken. Workaround exists. | Slack #engineering, fix in next deploy. |
| SEV4 | Cosmetic or non-blocking. | Open GitHub issue. |

## First 5 minutes of a SEV1

1. **Acknowledge** the alert in PagerDuty.
2. **Post in #incidents** Slack: `Investigating SEV1: <one-line summary>`.
3. **Open dashboards** in browser tabs:
   - Sentry (server + browser project)
   - Better Stack uptime
   - Atlas Performance Advisor
   - Cloudflare → unghost-prod container status
4. **Check the most recent deploy**:
   ```bash
   curl -sI https://www.unghost.com/api/health | grep x-app-version
   ```
   Compare with the last GitHub release. If they differ, suspect the new image first.

## Decision tree

```
                    [Health check failing?]
                          /         \
                       Yes           No
                       /              \
        [Mongo+Redis OK?]         [Check Sentry — 500s spiking?]
            /     \                   /            \
          No      Yes                Yes           No
          /        \                  /              \
   Provider issue  Re-deploy   App regression    Upstream provider
   page Atlas /    (or check    → ROLLBACK       (Claude, MSG91, etc)
   Upstash         egress IP    per runbook       → flip mock-mode
   support         allowlist)                       in env, redeploy
```

## When to escalate

- After 15 min of investigation with no recovery → page founder.
- Customer data exposure → page founder + legal within 30 min.
- Payment-processor breach (PhonePe) → page founder + finance immediately.

## Communication channels

- **#incidents** — live tick-tock during the incident
- **#engineering** — engineering discussion
- **status.unghost.com** — public-facing status page (Better Stack)
- **support@unghost.com** — customer email response template lives in admin/emails

## Post-incident

Schedule post-mortem within 48 hours. Template:
- What happened (timeline UTC)
- User impact (count, duration, affected flows)
- Root cause (the actual one, not the symptom)
- What worked
- What didn't
- Action items (each with owner + due date)
