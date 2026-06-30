# Scalability Analysis — unGhost Platform

**Date:** 2026-06-30
**Stack:** Next.js 14.2.18 (Turbopack) · MongoDB Atlas · Upstash Redis · Vercel Serverless
**Auth:** NextAuth (JWT) · **Queue:** Inngest · **Payments:** Razorpay + PhonePe
**AI:** Groq (Mixtral) · **Email:** Resend · **Storage:** Cloudflare R2 · **Streaming:** Livepeer

---

## Executive Summary

The platform is **well-architected for moderate scale** (10k–100k users, 100k–500k applications) but has **6 critical bottlenecks** that will surface at high scale (500k+ users):

| Risk Level | Count | Key Areas |
|------------|-------|-----------|
| 🔴 Critical | 6 | Redis saturation, unoptimized aggregations, missing indexes, AI cost DOS, session epoch overhead, no ISR |
| 🟠 High | 8 | Connection pooling, N+1 queries, embedded document scaling, webhook idempotency gaps, cron job overlap, bundle bloat, no CDN strategy, font loading |
| 🟡 Medium | 10 | Rate limit granularity, cache invalidation, migration debt, test coverage, error boundary gaps, accessibility surface, feature flagging, vendor lock-in, monitoring gaps, type safety |
| 🟢 Low/Info | 6 | Polyfill handling, dead code, env validation, docker strategy, CSP hardening, provider normalization |

**Overall Verdict:** The monolith can handle 50k–100k MAU before hitting the first hard ceiling (Redis HTTP saturation + MongoDB aggregation timeouts). At that point, the platform needs a targeted queue extraction (payments → async), Redis connection upgrades, and aggregation rewrites — but not a full microservices breakup.

---

## 🔴 Critical Bottlenecks

### 1. Redis: HTTP Round-Trip Saturation

**Current Architecture:** Every Redis operation is a standalone HTTPS request to Upstash REST API. A single authenticated API request makes **1–6 sequential HTTP round-trips**:

| Step | Calls | Location |
|------|-------|----------|
| Edge middleware (session epoch) | 1 `GET` | `middleware.ts` |
| Rate limit | 3 `INCR` + `EXPIRE` + `TTL` | `server/lib/rate-limit.ts` |
| Idempotency check | 1 `GET` (conditional) | `server/lib/idempotency.ts` |
| Cache check | 1 `GET`/`SET` (conditional) | `server/lib/cache.ts` |
| **Max total** | **6** | |

At ~100ms avg round-trip latency from Vercel us-east-1 → Upstash, that's **600ms added before MongoDB is even queried**.

**Scaling Limit:** Upstash REST is HTTP/1.1 with connection reuse, but at 500+ concurrent requests per second, HTTP connection management becomes the bottleneck. Each Vercel function instance opens its own connection pool. During traffic spikes (cohort launches, marketing campaigns), the platform hits:

- **Upstash undocumented rate limits** → HTTP 429s → silent fallthrough to DB (increased load)
- **Vercel function concurrency limits** → cold starts increase as functions scale

**Fix (10 min):** Remove the redundant `TTL` call in `rate-limit.ts`. The `INCR` return value already gives the count; `retryAfterSec` can default to `opts.windowSec`.

**Fix (1 week):** Migrate critical Redis paths (session epoch, rate limits) from Upstash REST to a **regional Redis instance** (e.g., Redis on Vercel Marketplace or Upstash Redis with dedicated connection). REST is for low-frequency ops; auth checks and rate limits fire on every request.

### 2. MongoDB Aggregations: Unbounded Collection Scans

**`getAdminApplicationAnalytics`** (`server/store.ts:1072`) runs a `$facet` with **no `$match` pre-filter**:

```js
ApplicationModel.aggregate([
  { $facet: {
    overall: [{ $group: { ... } }],            // scans ALL documents
    hired: [{ $match: { stage: "hired" } }, ...], // in-memory filter
    breached: [{ $match: { $or: [...] } }, ...]   // string date comparison
  }}
])
```

Three issues compound:
- **No leading `$match`** — at 50k applications this is a full collection scan across all sub-pipelines
- **`$addToSet: "$studentId"`** — grows an in-memory array of every student ID (50k+ elements)
- **String-based date comparison** (`slaDeadline: { $lt: nowIso }` with `$type: "string"`) — prevents index usage entirely

**Scaling Limit:** At ~500k applications, this aggregation WILL fail with `Exceeded memory limit for $group` (100MB default).

**Other aggregation risks:**
- `getBulkUserMetrics` in `server/creator/reward.service.ts` — scans all `processedtxns` with `{ plan: "premium", status: "success" }` — no index on this compound query
- `runSlaSweep` (`server/store.ts:2478`) — `find({ stage: { $in: ACTIVE_STAGES }, submitted: { $ne: false } })` — no `stage + submitted` compound index

### 3. AI Cost DOS: Rate Limiters Fail Open

All non-login rate limit buckets (coach, tutor, resume parsing, AI grading) fail **open** when Redis is unavailable:

```js
// server/lib/with-rate-limit.ts:123
catch { return { allowed: true, ... } }
```

This means:
- A Redis outage at Upstash removes all rate limiting for AI endpoints
- Each AI call costs ~$0.0003–$0.001 (Groq Mixtral)
- An attacker can exhaust the monthly AI budget in minutes
- The `maxDuration: 60` on coach/tutor routes means a Lambda timeout is the only backstop

**Fix (15 min):** Add `fallbackInProcess: true` to `coach`, `tutor`, `ai.parse-resume.*`, and instructor grading rate limit buckets — these are cost-critical, not just UX-critical.

### 4. Session Epoch: Redis on Every Request

Every page load and API call passes through `middleware.ts` which decodes the JWT and calls `GET session:epoch:<userId>` on Upstash. This means:

- **100% of requests** hit Redis before reaching the handler
- At 100 RPM (requests per minute): fine
- At 10,000 RPM: 10,000 sequential HTTP calls to Upstash
- The middleware runs on **Vercel Edge**, which has tighter CPU/memory limits than Node.js

**Fix:** Cache the epoch in the JWT itself. The JWT already contains a `sessionEpoch` field (set on login/token refresh). The middleware check compares JWT `sessionEpoch` vs Redis `epoch`. If epoch is embedded in the JWT at login time and only checked against Redis on writes (not reads), the middleware can skip Redis on 90%+ of requests:

```js
// JWT already has sessionEpoch from the jwt() callback
// Only need Redis check when the user performs a write action
// OR when the token expires and needs refresh
```

### 5. No Incremental Static Regeneration (ISR)

No page routes use `export const revalidate` or `generateStaticParams`. Every page is either fully static (pre-rendered at build) or fully dynamic (fetches per request). This means:

- Pages like job listings, bootcamp listings, and public profiles are **dynamically rendered on every visit**
- No CDN caching layer for public content
- MongoDB receives a read query on every page load, even for data that changes daily (not per-second)

**Fix:** Add ISR to:
- Job listing pages (`revalidate: 60`)
- Bootcamp listing pages (`revalidate: 300`)
- Instructor/public profiles (`revalidate: 3600`)
- Blog/docs pages (`revalidate: 86400`)

### 6. Mixed Animation Frameworks: GSAP + framer-motion

The landing page has GSAP (ScrollTrigger in `HeroReveal.tsx`, Lenis in `SmoothScroll.tsx`) AND framer-motion (in `HeroCTAs.tsx`, `HeroDemoLoop.tsx`, `FAQ.tsx`, `MagneticCard.tsx`, `MotionSection.tsx`, `RevealText.tsx`, `StaggerGrid.tsx`, `ParallaxBackdrop.tsx`, `ScrollProgress.tsx`) running in the same `<main>` component tree.

GSAP runs its own `requestAnimationFrame` ticker. framer-motion also uses `requestAnimationFrame`. They compete for animation frames during scroll, causing:

- Frame drops on mid-range devices
- Hero reveal stutter at viewport transition
- ~45KB combined bundle overhead from both libraries

**Fix:** Consolidate to ONE animation framework. Keep framer-motion for UI animations (scroll reveals, micro-interactions) and remove GSAP. Replace the GSAP hero reveal with framer-motion's `useScroll` + `useTransform` — already used in `ParallaxBackdrop.tsx`, demonstrating the pattern works.

---

## 🟠 High-Concern Areas

### 7. MongoDB Connection Pool: 500-Connection Ceiling

MongoDB Atlas Flex tier has a **500 connection limit**. Current config (`server/db/mongo.ts`):

```js
mongoose.connect(uri, {
  maxPoolSize: 10,    // per-function-instance cap
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
})
```

On Vercel, each serverless function instance creates its own connection pool. With `maxPoolSize: 10` and Vercel's auto-scaling (up to 1000 concurrent instances during a spike), the platform could open **10,000 MongoDB connections** — 20x the Atlas Flex limit.

**Reality check:** Most instances are short-lived and connections get reused, but during cold-start bursts (traffic spike to a previously cold page), connection storms are real.

**Fix:** Reduce `maxPoolSize` to `5` (typical for serverless), and add a connection monitor:

```js
mongoose.connection.on('error', (err) => {
  if (err.message?.includes('too many connections')) {
    sentry.captureMessage('MongoDB connection limit approaching', 'error');
  }
});
```

### 8. N+1 Query Patterns in Instructor Dashboard

`getInstructorTodaySignals` (`server/store.ts:1432`) does:
1. `find({ instructorId })` on bootcamps
2. Loads ALL enrolled student IDs
3. `find({ _id: { $in: allStudentIds } })` on users
4. JS iteration over each user's embedded `bootcampProgress` array

At 200 students per bootcamp × 5 bootcamps = **1000 embedded documents loaded into JS memory per instructor dashboard render**. The code comments acknowledge this: *"Revisit if instructors accumulate >5k students."*

**Fix (v2):** Replace with an aggregation pipeline using `$unwind` on `profile.bootcampProgress` and `$lookup` on bootcamps. This is a known pattern — the current implementation is explicitly temporary.

### 9. Embedded Document Scaling: bootcampProgress

`bootcampProgress` is an **embedded subdocument array** inside `UserModel.profile`. This means:

- Cannot index individual progress records (e.g., `{ "profile.bootcampProgress.bootcampId": 1, status: 1 }`)
- Every user query loads ALL progress records (even for bootcamps the user completed 2 years ago)
- `$push` into the array grows the document size, eventually hitting MongoDB's **16MB document limit**

**Scaling Limit:** At ~50 bootcamp enrollments per user with full progress data, each user document grows by ~50KB. At 100k users, this is fine — the 16MB limit is distant. But the index gap is the real problem.

### 10. Webhook Idempotency: Race Condition Window

Razorpay and PhonePe webhooks check idempotency by querying `payments.findOne({ razorpayPaymentId })` or by merchant transaction ID. Between the check and the fulfillment, a duplicate webhook delivery could race:

```
Webhook 1: check → not found → (network interrupt)
Webhook 2: check → not found → fulfill
Webhook 1: (retry) → check → not found → fulfill again (duplicate!)
```

**Fix:** Add a MongoDB unique index on `razorpayPaymentId` / merchant transaction ID with `insertOne()` instead of `findOne()` + `updateOne()`. The unique index converts the race into a duplicate key error that can be safely ignored:

```js
try {
  await PaymentsModel.create({ razorpayPaymentId, status: 'processing', ... });
} catch (err) {
  if (err.code === 11000) return Response.json({ ok: true }); // duplicate = already processed
  throw err;
}
```

### 11. Cron Job Overlap Risk

6 cron jobs run on scheduled intervals. Long-running jobs (SLA sweep, subscription sweep) could overlap with the next scheduled run if the previous hasn't finished:

```yaml
# vercel.json
crons: [
  { path: "/api/cron/sla-sweep", schedule: "0 * * * *" },        // hourly
  { path: "/api/cron/subscription-sweep", schedule: "0 */6 * * *" }, // every 6h
  { path: "/api/cron/referral-session-sweep", schedule: "*/30 * * * *" },
  { path: "/api/cron/reward-reconcile", schedule: "0 */12 * * *" },
  { path: "/api/cron/saved-search-digest", schedule: "0 9 * * 1" },
]
```

The SLA sweep could take >60 minutes if the applications collection grows large — causing the next hourly run to overlap. No distributed locking mechanism prevents concurrent executions.

**Fix:** Add a Redis-based distributed lock (`SET lock:<job-name> NX EX 3600`) at the start of each cron handler. Skip execution if the lock is held.

### 12. Frontend Bundle Size

Estimated render-blocking bundle on the landing page:

| Library | Size (gzipped) |
|---------|----------------|
| framer-motion | ~18 KB |
| GSAP + ScrollTrigger | ~18 KB |
| Lenis | ~7 KB |
| Lucide icons (partial) | ~8 KB |
| Sentry SDK | ~15 KB |
| **Total render-blocking** | **~66 KB** |

Plus the landing page imports: `HeroReveal`, `HeroDemoLoop`, `BootcampCardStack`, `HeroCTAs`, `JobMarquee`, `ScrollPrompt`, `SmoothScroll`, `LiveSessionsTeaser`, `FAQ`, `CookieConsent`, `CoursesSection` — 11+ components loaded eagerly.

**Fix:** 
- Consolidate GSAP → framer-motion (saves 18 KB)
- Tree-shake unused icons (lucide-react is tree-shakable with named imports — verify this works)
- Consider code-splitting `BootcampCardStack` (it uses GSAP CardSwap — only visible below the fold)

### 13. No CDN Cache Strategy for Public Content

No `Cache-Control` headers set on API responses for public endpoints (`/api/jobs`, `/api/skills/search`, `/api/health`). All requests hit the origin. For job listings viewed by unauthenticated visitors, this creates unnecessary load.

**Fix:** Add `Cache-Control: public, s-maxage=60, stale-while-revalidate=30` to public GET endpoints in `next.config.mjs` headers config or per-route.

### 14. Font Loading: Single Inter Instance But No Preload

`layout.tsx` loads Inter (400–800 weights) via `next/font` with `display: swap`. While the single-instance optimization is good, there's no explicit `<link rel="preload">` for the hero-content font weights (700/800) in the landing page layout. Combined with `display: swap`, this causes a **FOUT (flash of unstyled text)** on every page load.

**Fix:** Add `preload: true` to the `Inter()` instance — it's already the default in `next/font`, but verify it's working. Audit for CLS (Cumulative Layout Shift) in Lighthouse.

---

## 🟡 Medium-Concern Areas

### 15. Rate Limit Granularity Gaps

24 rate limit buckets exist, but some gaps:

- **No global API rate limit** — a single user/IP can hit 200+ endpoints per second across different bucket keys
- **No per-endpoint limits for POST routes** — many POST handlers (job create, thread reply, etc.) have no rate limiter at all
- **Webhook endpoints have no IP allowlisting** — Razorpay/PhonePe webhooks check HMAC signatures but not source IP. An HMAC leak would allow replay from any IP

**Fix:** Add a catch-all API rate limit (e.g., 1000 req/min per user) in middleware. Add IP allowlisting to webhook routes.

### 16. Cache Invalidation Strategy

`server/lib/cache.ts` has a simple TTL-based cache wrapper with the pattern:
```js
const cached = await r.get(key);
if (cached) return JSON.parse(cached);
const data = await loader();
await r.set(key, JSON.stringify(data), { ex: ttl });
```

No explicit invalidation on writes. Data stale for up to the TTL window. For the landing page's job marquee and course data displayed to unauthenticated users, this is fine. For recruiter-facing data (saved searches, templates), stale data could cause confusion.

**Fix:** Add explicit cache-busting keys (e.g., increment a `cache:version:jobs` counter when a job is created/updated). Cache reads include the version in their key.

### 17. Migration Debt in Components

The design system migrated from legacy tokens (`brand-primary`, `brand-ink`, etc.) to Tailwind classes (`brand-500`, `neutral-900`), but many components still use the old tokens:

- `components/landing/MagicWidget.tsx` — 6 references to legacy tokens
- `components/live/LiveSessionsTeaser.tsx` — ~15 references to `brand-ink`, `brand-muted`, `brand-primary`
- `app/forgot-password/page.tsx` — legacy tokens
- `app/reset-password/[token]/page.tsx` — legacy tokens
- `app/login/page.tsx` — legacy tokens in multiple places

This means **two color systems coexist** — a design change to `brand-500` won't propagate to components using `brand-primary`. At scale, this creates visual drift.

**Fix:** Add an ESLint rule banning legacy token usage with autofix. Track migration progress.

### 18. Test Coverage Gaps

- **Vitest** is configured but coverage level is unknown
- **Playwright** is configured for E2E tests
- No test files visible in the exploration for critical paths:
  - Payment fulfillment (webhook handlers)
  - SLA sweep (the core value proposition)
  - Rate limiter edge cases (Redis failure, concurrent requests)
  - Auth flows (signup, email verification, password reset)

**Fix:** Add integration tests for the 5 most critical paths: payment webhook, SLA breach detection, auth signup flow, application submission, resume parsing.

### 19. Error Boundary Coverage

`app/error.tsx` and `app/global-error.tsx` exist as catch-all error boundaries. No granular error boundaries for specific sections:

- `FAQ` dynamic import has no error boundary → if it fails, the entire page below it is blank
- `LiveSessionsTeaser` has no error boundary → an error in the server component crashes the section
- No section-level boundaries for course cards, pricing, or bootcamp display

**Fix:** Wrap each independently-fetched section in `<ErrorBoundary fallback={<SectionSkeleton />}>`.

### 20. Accessibility Surface Area

The landing page has good keyboard focus rings and `useReducedMotion()`. The rest of the app's accessibility posture is unknown:

- No `aria-` attributes visible in admin or dashboard routes
- No focus trap management in modals (BootcampCardStack's "Our Instructors" modal — `AnimatePresence` without focus management)
- No skip-to-content link
- Color contrast of `brand-500 + white` buttons remains an issue (2.3:1 ratio, see UI/UX audit)

**Fix:** Audit the 5 most-used pages (landing, signup, dashboard, job listing, bootcamp listing) with axe DevTools.

### 21. Feature Flagging Absence

No feature flag system exists. Every code path is either live or behind a comment. This means:

- Canary releases require DNS-level routing (separate deploys)
- Gradual rollouts are impossible
- Kill switches require hotfix deploys

**Fix:** Integrate a lightweight feature flag service (e.g., Vercel Flags, LaunchDarkly, or a simple `flags.json` in Redis) for the SLA sweep, new payment flows, and AI feature rollouts.

### 22. Vendor Lock-In: Upstash + Vercel + Atlas

| Service | Migration Difficulty | Lock-In Level |
|---------|---------------------|---------------|
| Upstash Redis | Low (Redis protocol is standard) | 🟡 Medium |
| Vercel Serverless | High (Next.js + Edge + Cron tight coupling) | 🔴 High |
| MongoDB Atlas | Medium (Mongoose abstracts driver) | 🟡 Medium |
| Cloudflare R2 | Low (S3-compatible API) | 🟢 Low |
| Resend | Low (SMTP fallback exists) | 🟢 Low |
| Groq | Low (OpenAI-compatible API) | 🟢 Low |
| Liveblocks | Medium (WebSocket protocol is standard) | 🟡 Medium |
| Livepeer | Medium (open source, self-hostable) | 🟡 Medium |

**Vercel lock-in is the highest risk.** The use of `@vercel/edge`, Vercel Cron Jobs, and Vercel-specific environment variables means migrating to another host requires significant rework. Mitigation: document the Vercel-specific abstractions and plan a migration path if cost becomes prohibitive at scale.

### 23. Monitoring Gaps

Sentry is configured with `tracesSampleRate: 0.1` (client) and `0.2` (server). But:

- No custom performance monitoring for the SLA sweep or key business transactions
- No uptime monitoring for MongoDB, Redis, or external integrations
- No alerting for:
  - Connection pool nearing limits
  - Redis latency spikes
  - Payment webhook failures (HMAC mismatches)
  - Cron job failures
  - Aggregation timeouts

**Fix:** Add Sentry custom metrics for:
- SLA sweep duration + breach count
- Payment webhook latency + failure rate
- MongoDB connection count
- Redis latency p50/p95

### 24. Type Safety Surface

Custom `next-auth.d.ts` augments Session/User/JWT types correctly. However:

- Many route handlers return `Response.json(...)` without typed responses
- Mongoose models use TypeScript interfaces but query results are typed as `any` in some store functions
- No runtime validation on API request bodies (zod, valibot, or similar)

**Fix:** Add zod validation schemas to the most critical endpoints: payment webhooks, auth signup, application submission, SLA breach notifications.

---

## 🟢 Informational / Low Risk

| # | Observation | Status |
|---|-------------|--------|
| 25 | **Polyfill handling** — No explicit polyfill management for older browsers | Low: Next.js 14 handles modern JS |
| 26 | **Dead code** — `GuaranteeClock` never imported, unused `ParallaxBackdrop` intensity prop, legacy `brand-gradient` CSS class | Low: no runtime impact, bundle excluded by tree-shaking |
| 27 | **Environment validation** — `.env.example` exists but no runtime validation that required vars are set | Low: fails at first integration call |
| 28 | **Docker strategy** — `docker-compose.yml` and `Dockerfile` exist for self-hosting but the app is deployed on Vercel | Low: useful for local dev |
| 29 | **CSP hardening** — No Content-Security-Policy headers visible | Low: no sensitive user-content rendering |
| 30 | **Provider normalization** — Multiple AI providers referenced (Groq, Anthropic in deps, Google Gemini in deps) but only Groq is wired | Low: dependency clean-up opportunity |

---

## Action Plan (Priority Order)

| Priority | Effort | Impact | Action |
|----------|--------|--------|--------|
| **Week 1** | | | |
| 🔴 1 | 10 min | High | Remove redundant `TTL` call in `rate-limit.ts` |
| 🔴 2 | 30 min | Critical | Add `$match` pre-filter + `allowDiskUse` to `getAdminApplicationAnalytics` |
| 🔴 3 | 15 min | High | Add `fallbackInProcess: true` to AI-related rate limit buckets |
| 🔴 6 | 1 day | Medium | Consolidate GSAP → framer-motion, remove Lenis |
| 🟠 7 | 1 hour | High | Reduce `maxPoolSize` to 5, add connection monitor |
| **Week 2** | | | |
| 🔴 4 | 2 days | High | Embed session epoch in JWT, skip Redis on read requests |
| 🟠 11 | 1 day | Medium | Add distributed lock to cron jobs |
| 🟠 12 | 2 days | Medium | Audit and reduce frontend bundle |
| 🟡 18 | 3 days | Medium | Add integration tests for top 5 critical paths |
| **Week 3-4** | | | |
| 🔴 5 | 1 day | Medium | Add `revalidate` to public listing pages |
| 🟠 10 | 1 day | Medium | Switch webhook idempotency to `create()` with unique index |
| 🟠 8 | 2 days | Low | Refactor `getInstructorTodaySignals` to aggregation pipeline |
| 🟡 16 | 1 day | Low | Add cache-busting on write operations |
| 🟡 20 | 1 day | Low | Add focus trap to all modals, audit a11y |
| **Month 2** | | | |
| 🟠 13 | 2 days | Medium | Add CDN caching strategy for public content |
| 🟡 15 | 2 days | Medium | Add catch-all API rate limit + webhook IP allowlisting |
| 🟡 21 | 1 day | Low | Implement feature flag system |
| 🟡 23 | 2 days | Low | Add Sentry custom metrics for critical transactions |
| **Month 3** | | | |
| 🔴 1 | 1 week | High | Migrate critical Redis paths to dedicated regional instance |
| 🟡 19 | 2 days | Low | Add error boundaries to every independently-fetched section |
| 🟡 17 | 3 days | Low | Complete legacy token migration with ESLint rule |
| 🟡 24 | 1 week | Low | Add runtime validation to critical API routes |

---

## Architecture Verdict

```
Current Scale:      🟢 < 10k users
Week 1 Fixes:       🟢 < 50k users
Month 1 Fixes:      🟢 < 200k users
Month 3 Fixes:      🟡 < 1M users
Full Rewrite:       🔴 > 1M users
```

The monolith is **not a scaling dead end.** The adapter pattern (all external integrations behind interfaces), idempotency layer, and DPDP compliance infrastructure provide a solid foundation. The platform will need a **targeted extraction** (not a full breakup) at ~1M users:

1. **Payments → separate service** (the most sensitive path, needs independent scaling)
2. **AI processing → async queue** (coach/tutor are long-running, don't belong in-serverless)
3. **Redis → regional dedicated instance** (Upstash REST won't scale to 10k+ RPM)
4. **Search → dedicated search service** (candidate search, job search — MongoDB text search hits limits at ~1M documents)
