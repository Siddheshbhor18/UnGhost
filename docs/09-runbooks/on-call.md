# Runbook — on-call

## Rotation

Until the team is large enough for a true rotation, on-call is the founder + tech lead, 24/7. Add engineers as the team grows.

## What you're responsible for

When you have the pager:

1. **Respond within 5 min** to SEV1 alerts (during waking hours), 15 min off-hours.
2. **Triage** — assign Sev, post in #incidents, start the runbook.
3. **Communicate** — every 15 min during a SEV1, even if it's "still investigating".
4. **Recover** — focus on restoring service, not finding the root cause. Root cause analysis is for the post-mortem.
5. **Hand off** if the incident extends past your shift. Document the state in #incidents before sleeping.

## Tooling check (do this on Monday morning)

- [ ] PagerDuty mobile app installed, notifications ON, override mode OFF
- [ ] Sentry mobile app installed
- [ ] `wrangler` CLI authenticated (`wrangler whoami` returns you)
- [ ] Slack #incidents joined + notifications ON
- [ ] Atlas dashboard bookmark works without re-login
- [ ] Better Stack dashboard bookmark works
- [ ] You can reach the rollback runbook offline (laptop bookmark + phone screenshot)

## After an incident

- Update the runbook if a step was unclear.
- Add a missing alert if the incident wasn't caught fast enough.
- Add a test if it could have been caught in CI.

## Anti-patterns

- **Don't debug solo for >15 min.** Pull in a second pair of eyes. Pride costs uptime.
- **Don't push fixes directly to prod.** Even during incidents, go through PR → preview → staging if at all possible. The exceptions are documented (security disclosures, customer data exposure).
- **Don't silence alerts** to "concentrate". Add a temporary mute if you must, but log it.
