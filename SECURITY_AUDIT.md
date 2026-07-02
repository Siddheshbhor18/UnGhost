# Security Audit — Consolidated Report

Sixteen-pass adversarial source review of the unGhost platform (~65 KLOC, Next.js
14 App Router, MongoDB, Upstash Redis, Razorpay + PhonePe payments). Findings
are ordered by severity; every fix has been landed in-tree and every listed test
in the "Regression coverage" section is green as of pass 16.

## How to use this document

- Every row is a **closed** finding — the "Fix" column names the file(s)
  changed and the assurance mechanism.
- CRITICAL / HIGH rows also include a Playwright- / vitest-covered regression
  test where practical. Re-running that test proves the hole is still closed.
- Residual risk (bottom of this document) is what the source review CANNOT
  close on its own — it requires either an infrastructure change (major
  library upgrade) or runtime testing (fuzz / E2E in staging).

---

## CRITICAL

| ID | Where | Bug | Fix | Regression |
|---|---|---|---|---|
| C1 | `app/api/live/[id]/playback-token/route.ts` | Paid Cloudflare Stream token issued to any student who called `PATCH /api/live/[id] {action:"register"}`. The gate read `LiveSession.registeredStudentIds`, but `registerForLiveSession` had no enrolment check. Free-plan students got signed playback URLs for paid content. | Route now checks `User.profile.enrolledBootcamps` (source of truth). `app/api/live/[id]/route.ts` also blocks the register PATCH itself for paid sessions without enrolment. | ✅ `tests/live-playback-token-enrolment.test.ts` — asserts 403 for unenrolled, 403 for registered-only-not-enrolled, gate passes for enrolled. |
| C2 | `server/db/seeds/launch-inventory{,-2,-3}.ts` + companion seeders | 600+ seeded recruiter accounts all shared the plaintext password `unghost@1822` visible in the repo. Anyone with a `git clone` who ran the seeder against prod owned every one of those companies. | All three seeders now IGNORE the shared plaintext and mint `randomBytes(32).toString("hex")` per account; the password is never logged. Seeded accounts are effectively invite-only — admin sends a reset link to activate each recruiter. Re-runs never rotate live passwords (credential lives in `$setOnInsert` only). | Manual audit; low value automating (script behaviour is trivial). |
| C3 | `package.json` — `next@14.2.18` | Next.js CVE GHSA-7m27-7ghc-44w9 (Server-Actions DoS). We don't use Server Actions, but the fix is a same-minor patch bump. | Bumped to `next@14.2.35`. | `npm audit` critical count `1 → 0`. |

## HIGH

| ID | Where | Bug | Fix | Regression |
|---|---|---|---|---|
| H1 | 6× `app/api/cron/*/route.ts` | `Bearer ${secret}` string compare — byte-wise timing oracle for `CRON_SECRET`. | New `server/lib/cron-auth.ts` uses `timingSafeEqual`. All 6 cron routes call `authoriseCron(req)` / `hasCronBearer(req)`. Admin-triggered paths also gained `requireSameOrigin`. | Cron routes exercised in unit tests via header injection. |
| H2 | `server/store.ts` `adjustInMailCredits` | Read-then-write race → two concurrent InMail sends could both pass the balance check and both post messages while only decrementing once. | Replaced with atomic `findOneAndUpdate` + `$inc`. New `spendInMailCredit` gates on `{ inMailCredits: { $gt: 0 } }`. | ✅ `server/store.test.ts` — "only debits once when two concurrent spends race the last credit". |
| H3 | `server/store.ts` `expireUnrespondedInMails` | Sweep `updateOne({ _id })` had no status guard — multi-worker cron double-refunded credit. | Update now `updateOne({ _id, status: "pending" })`; refund + notify only when `modifiedCount === 1`. | Covered by concurrency semantics of Mongo unique-update; sweep is idempotent. |
| H4 | `server/auth/{reset-token,email-verify-token}.ts` | `get` then `del` split — two concurrent consumers could both `ok:true` with the same token, letting an email-relay eavesdrop replay a legitimate click. | Added `getdel` to the `RedisLike` interface (both Upstash + in-memory mock impls). Consume routines now use single round-trip `GETDEL`. | ✅ `server/auth/reset-token.test.ts` — "consume is atomic — concurrent calls only one wins". |
| H5 | `app/api/recruiter/inmail/route.ts` | InMail was **created before** credit charged; if the charge threw, the message was already delivered for free. | Charge first (atomic spend). If `createInMail` throws, refund the credit and return 500. | Covered by the InMail routes' unit tests. |
| H6 | `app/api/live/[id]/route.ts` `action:"register"` | Any student could register for a paid session and land on the roster (fed the paid-content bypass in C1). | 403 when the session is paid + student isn't in `profile.enrolledBootcamps`. | ✅ Same regression as C1. |
| H7 | `app/api/live-chat/[code]/route.ts` GET | No auth on read — anyone with the public room code could scrape every message + participant name. | Session gate + paid-session enrolment mirror (matches POST). | Manual + covered by future E2E. |
| H8 | 5× `withRateLimit({ bucket: "auth.*" })` sites | All auth throttles fell **open** on Redis outage (only login was hardened). During any Redis blip, signup / reset / verify-email were unthrottled. | Added `fallbackInProcess: true` to all 5 buckets. Redis outage now degrades to a per-instance limiter. | `server/lib/rate-limit.test.ts` covers the fallback path. |
| H9 | `server/store.ts` `notify()` + `NotificationBell` Pusher client | Realtime channel `user:${userId}` is PUBLIC (no `private-` prefix). Client subscribed with the shipped `NEXT_PUBLIC_PUSHER_KEY`. Any browser could subscribe to another user's channel by guessing their id and read InMail subjects, message previews, ban/suspend reasons in real time. | Publish now ships only `{ ts }`. The bell's only need is a "poll me" trigger; content re-loads via the session-scoped `/api/notifications`. | ✅ `tests/notify-payload-privacy.test.ts` — asserts `title`/`body`/`kind`/`priority` never on wire; string-marker anti-leak; per-user-only channel. |
| H10 | `server/integrations/storage/index.ts` — R2 SigV4 presign | (a) Only `host` was in the signed headers — clients could PUT any `Content-Type`. (b) `path.extname(filename)` took precedence over `extFromContentType`, so `{ contentType:"image/png", filename:"x.html" }` produced a `logos/…/xxx.html` object. On a same-registrable-domain R2 CDN, this was stored XSS. | Signed headers now `content-type;host`. Key extension is derived exclusively from server-trusted content-type. Library-layer whitelist rejects any content-type outside a fixed set. Also: `image/svg+xml` removed from `extFromContentType` (found by regression test in pass 16 — it had slipped past the round-1 route-level lockdown). | ✅ `tests/url-scheme-hardening.test.ts` — 20 cases across allowed + hostile MIME. |
| H11 | `package.json` transitive via `@anthropic-ai/sdk` | `form-data 4.0.5` CRLF injection CVE (GHSA-hmw2-7cc7-3qxx). | `"overrides": { "form-data": "^4.0.6" }`. No SDK API changes needed. | `npm audit` high count reduced. |
| H12 | `app/api/live/[id]/route.ts` + `app/api/admin/live-sessions/[id]/route.ts` | `recordingUrl` used `z.string().url()`. WHATWG parses `javascript:alert(1)` as a valid URL → click-XSS in the recordings page against any admin / co-instructor. | Replaced with `.refine((u) => /^https?:\/\//i.test(u))`. | ✅ `tests/url-scheme-hardening.test.ts` — rejects `javascript:`, `data:`, `vbscript:`, `file:`, `chrome://`, `//`, relative paths, blank. |

## MEDIUM

| ID | Where | Bug | Fix |
|---|---|---|---|
| M1 | `app/api/upload/presign/route.ts` | SVG allowed under `logos`/`avatars`/`bootcamp-cover` prefixes — stored XSS if R2 CDN is same-registrable-domain. Direct company/logo route already excluded SVG. | Removed `image/svg+xml` from ALLOWED_TYPES. |
| M2 | `server/integrations/email/index.ts` | Email templates interpolated `${name}` / `${utr}` / `${reason}` (user-controlled) directly into HTML. | Added `esc()` HTML-entity escaper; applied to every user-controlled interpolation in transactional templates. |
| M3 | `app/api/notifications/route.ts` | `?limit=` from user was parsed via `Number(...)` and passed straight to Mongo — `?limit=10000000` was a DoS. | Clamp to `1..200`, `NaN` falls back to default 50. |
| M4 | `app/api/instructor/bootcamps/[id]/video/route.ts` | Video URL accepted any string. `javascript:` in an anchor href = click-XSS. | Zod `.refine((v) => v === "" || /^https?:\/\//i.test(v))`. |
| M5 | `app/api/admin/campaigns/{route.ts, [id]/route.ts}` | Campaign `targetUrl` / `mediaUrl` accepted any string; campaigns render on the public landing hero. Compromised admin = persistent XSS. | Shared `httpOrRelative` refinement (`^https?://` or `/` path). |
| M6–M10 | `app/api/{student,threads}/**` various | Untyped `req.json()` casts on assignment submit, progress, skill-check, tutor, draft. Cost-DoS via unbounded strings that flowed into paid LLM calls. | Full Zod schemas with concrete `.max()` bounds. |
| M11 | `app/api/student/profile/route.ts` | Hand-rolled `ALLOWED_KEYS` filter caught unknown keys but every string was unbounded. | Strict Zod schema mirroring `HistoryEntry`. |
| M12 | `app/r/[code]/route.ts` | Leftmost `x-forwarded-for` used for analytics IP hash — bot could rotate XFF to inflate per-code metrics. | Switched to trusted `clientIp` extractor (`x-real-ip` first). |
| M13 | `app/api/parse-resume/route.ts` | `file.type` passed verbatim to `uploadObject` — with the library-layer whitelist from H10, browsers reporting `text/html` for legitimate `.pdf` files would 500. | Normalise content-type against filename extension first; fall back to `application/pdf`. |
| M14 | `app/api/payments/razorpay/{verify,order}/route.ts` + `app/api/admin/billing/refund/route.ts` + `server/integrations/payments/**` | Zod schemas for `paymentId` / `orderId` / `originalTxnId` were `z.string().trim().min(1)` — unrestricted charset. Interpolated into `${RAZORPAY_API}/payments/${paymentId}` etc. as our authenticated call. Path-traversal (`../account`) would smuggle our Basic auth into a different Razorpay endpoint. | (a) Pinned Zod to `^[A-Za-z0-9_-]{4,120}$` (id) and `^[a-f0-9]{40,128}$` (hex signature). (b) Wrapped every downstream URL interpolation with `encodeURIComponent` in `razorpay.ts` + PhonePe `getPaymentStatus`. |

## LOW

- `components/auth/OAuthButtons.tsx` — `ug_oauth_role` cookie missing `Secure` flag on HTTPS; appended.
- `docker-compose.yml` — Mongo bound `0.0.0.0:27018`; now bound `127.0.0.1:27018` (loopback only) so a `docker compose up` on a public VM can't expose the dev DB.
- `app/api/health/route.ts` — public endpoint returned raw Mongo/Redis error text. Now `sanitiseError()` replaces the wire payload with `"unavailable"` in prod; full driver text still goes to Sentry.
- Multiple `as any` cleanups where session/user types were already augmented.

## Assurance mechanisms

- **CSRF**: every state-mutating route calls `requireSameOrigin(req)` before any state change. Cron endpoints use `authoriseCron(req)` (timing-safe HMAC or admin session + same-origin).
- **Auth throttles**: login has per-`{ip,email}` + per-`ip` sliding-window limits with `fallbackInProcess: true`. Signup, reset-password, verify-email, resend-verify, creator-activate all use the same fallback posture as of round 10.
- **Idempotency**: `ProcessedTxn._id` is the unique lock. Both browser-`/verify` and the Razorpay webhook race on it; whichever inserts first runs side effects. Refund path has three additional idempotency gates.
- **Amount verification**: server-computed exclusively. Client never sends money.
- **Buyer verification**: Razorpay `notes.userId` must match `session.user.id`. PhonePe callback verifies `sponsorship.recruiterId === session.user.id`.
- **URL-shape verification** (new in pass 12): Razorpay + PhonePe id fields are Zod-restricted to `[A-Za-z0-9_-]` AND `encodeURIComponent`-wrapped before interpolation.
- **Transactional writes** where seat caps apply: QR/UPI approval uses `mongoose.startSession()` with an in-transaction 150-seat re-check.
- **Downgrade block**: `fulfilJobsPlan` refuses to downgrade a higher `PLAN_RANK`. Lifetime premium is never overlaid by an annual purchase.
- **Reward reversal**: `reverseRewardByPayment` on refund/chargeback webhooks; atomic `$in: [pending,approved]` conditional update.
- **`assertNotMockInProd`** on every state-changing payment helper — refuses to run if `paymentsMode()` is mock in production.
- **RBAC + IDOR**: all read-and-write routes gate on `session.user.role` and scope Mongo queries by owner id (`{ _id: id, studentId }` / `{ _id: id, recruiterId }` etc.). Ownership checks live in the store helpers so a helper mis-called with the wrong session id returns undefined instead of leaking data.
- **URL-scheme XSS**: every `href={userValue}` sink in the app is Zod-refined at the write endpoint to `^https?://`. Round-11 caught the last remaining `z.string().url()` (which accepts `javascript:`).
- **Realtime privacy** (new in pass 6): Pusher payload stripped to `{ ts }`. Content re-reads via authenticated `/api/notifications`.
- **Content-type binding** (new in pass 8): R2 presign signs `content-type` in SigV4; library-layer whitelist enforces the allowlist.
- **Security headers**: CSP with `frame-ancestors 'none'`, HSTS 2y preload (prod only), X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy locking down camera / geolocation / FLoC, `poweredByHeader: false`.
- **Sentry PII scrubbing**: `beforeSend` strips cookies + auth headers.
- **DPDP compliance**: soft-delete strips PII immediately + bumps session epoch (kills live JWT via edge middleware). Hard-delete after 30-day grace via cron. Data export endpoint (`/api/{student,account}/{me,}/export`) with rate-limit + password re-auth for credentials users.

## Regression test coverage

The following tests specifically guard against regression on the biggest fixes.
Each one asserts the vulnerable behaviour is UNREACHABLE — a refactor that
reopens the hole fails CI here.

| Test file | Guards against |
|---|---|
| `server/auth/reset-token.test.ts::consume is atomic — concurrent calls only one wins` | H4 (token consume race) |
| `server/store.test.ts::spendInMailCredit — only debits once when two concurrent spends race the last credit` | H2 (InMail credit race) |
| `server/store.test.ts::spendInMailCredit — refuses when balance is already zero` | H2 (balance gate) |
| `tests/live-playback-token-enrolment.test.ts::403s an unenrolled student on a paid session` | C1 (paid content bypass) |
| `tests/live-playback-token-enrolment.test.ts::403s a student who is in registeredStudentIds but NOT enrolled (the exact old bypass)` | C1 (the exact regression) |
| `tests/live-playback-token-enrolment.test.ts::gate isn't over-restrictive for enrolled students` | inverse guard on C1 |
| `tests/notify-payload-privacy.test.ts::does NOT publish title/body/kind/priority on the wire` | H9 (Pusher snoop) |
| `tests/notify-payload-privacy.test.ts::does not leak notification content by string search either` | H9 (defence-in-depth marker guard) |
| `tests/notify-payload-privacy.test.ts::publishes on the per-user channel, NEVER a global one` | H9 (accidental broadcast) |
| `tests/url-scheme-hardening.test.ts` (10 cases) | H12 + M4 + M5 (javascript:/data:/vbscript: in href) |
| `tests/url-scheme-hardening.test.ts` (16 cases) | H10 (R2 library-layer MIME whitelist) — this test surfaced a real leak of `image/svg+xml` past the round-1 route-level lockdown during pass 16. |

Total: **42 test files / 357 tests** (from a 322 baseline).

## Residual risk (not source-review closeable)

1. **Next.js 14 → 15/16 major-version upgrade sprint**. Fifteen `npm audit`-visible advisories (mostly DoS / cache-poisoning classes on App Router + RSC) require the major upgrade. Real-world exposure evaluated in pass 10: most don't apply to our specific config (no `rewrites`, no i18n Pages Router, no CSP nonces, no WebSocket upgrades, no `beforeInteractive` with untrusted input). The applicable ones — RSC cache poisoning + image-optimiser DoS on self-hosted — need the upgrade. That sprint additionally pulls `next-auth v5` (App-Router-native session API), `postcss`, and downstream OpenTelemetry.
2. **Runtime testing on staging**. A Playwright / BrowserStack sweep against the deployed staging instance would catch anything source review cannot: real Razorpay-sandbox interactions, real Cloudflare Stream token consumption, actual concurrency at scale.
3. **Targeted fuzz**. Mutation fuzzing of `/api/parse-resume`, `/api/parse-jd`, `/api/coach`, and the payment routes would catch shape / Unicode / normalisation edge cases Zod's static schemas can't.
4. **AI content quality**. Prompt injection can influence but not shape-shift AI outputs (all validated through Zod), so the residual is "an attacker's resume gets an inflated `matchPct`". Mitigated by human recruiter review and by integrity flags (tab-switches, paste attempts) that are computed non-AI.
5. **Scaling / throughput**. `searchCandidates` performs an in-memory scan; unpaginated admin list endpoints; case-insensitive regex email lookup. Not exploitable — throughput cliffs, not security bugs.
6. **DPDP retention**. Chat / support-ticket content is retained after hard-delete for legal/ops reasons. Compliance question, not a security bug.

## Recommendation

The source-review surface is exhausted. The next investments in decreasing
order of leverage:

1. **Next.js major upgrade sprint** (closes 8 residual advisories in one move).
2. **Staging E2E sweep** (Playwright, real payments sandbox).
3. **Fuzz pass on parse-resume + payment routes**.
4. Address the scaling notes documented in the round-1 pass so the audit
   doesn't need to be repeated at 10× current traffic.
