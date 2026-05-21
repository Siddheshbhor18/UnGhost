# QR Payments + Google Meet — Revised Implementation Plan

> **Status:** awaiting your approval before any code is written.
> **Source:** `unGhost-Tech-Implementation-Payments-and-Google-Meet.pdf` (35 pages) as the baseline.
> This doc is the **diff** — only what changes from the PDF, plus the reasons.
> Anything not listed here = same as PDF.

---

## TL;DR of the delta

| Area | PDF says | Revised | Why |
|---|---|---|---|
| **SMS** | MSG91 templates + DLT submission | **Email-only via Resend** | You decided to rip MSG91. DLT lead time 2-5 days. Resend is live. |
| **Bootcamp model** | New file `server/bootcamps/model.ts` | **Extend existing** `server/db/models.ts → BootcampSchema` | Already exists. Duplicating registers `Bootcamp` twice → Mongoose error. |
| **Cron runtime** | Inngest | **Vercel Cron** (`vercel.json`) | Inngest not installed. `vercel.json` already present. No new SaaS. |
| **Admin gate** | `session.roles?.includes('admin')` | `session.user.role === 'admin'` | Your auth uses singular `role`. PDF gate would return 403 to all admins. |
| **Slack helper import** | `server/integrations/slack` | `server/lib/slack.ts` | That's where it actually lives. |
| **Route group `(admin)`, `(student)`, `(public)`** | Used in paths | **Use existing flat paths** `/admin/*`, `/student/*` | Your app uses flat. Don't introduce groups for two new pages. |
| **Activation copy** | "24 hours" in SMS template | **"~20 minutes"** in UI + email | You explicitly promised 20 min on submit. Align everywhere. |
| **Capacity check** | `count → if < max → create` | **Mongo transaction OR Redis slot reserve** | Plain count race-conditions under concurrent submits. |
| **Enrollment idempotency** | None | **`Idempotency-Key` header** on POST | Network drop after DB write = client retry = bad 409 UX. |
| **Rate limit on `/api/sessions/[id]/join`** | None | **Per-IP token bucket via Upstash** | Trivially DOS-able otherwise. |
| **Recordings** | `recordingUrl` field assumed populated | **Doc-only acknowledgement** that free Meet doesn't record | Recording needs Workspace Business Plus+ ($18/user/mo). V1 = manual upload. |
| **Daily Slack abuse digest** | 9am cron summary | **Per-flag webhook on create** | Digest = overengineering for v1. Real-time is more useful. |
| **`AbuseFlag.metadata: Mixed`** | Free-form | **Strongly-typed per `type`** | Queryability + future dashboards. |
| **Price math** | Recomputed at 3 layers | **One helper `computeTotalPaise(bootcamp)`** | DRY + single source for display/validate/email. |
| **PhonePe verification UX** | UTR shown as text | **Click-to-search merchant portal deep-link** | Cuts admin verify time. |

---

## What we KEEP from the PDF (verbatim)

1. Two-system split (A = QR payments, B = Google Meet).
2. `PaymentSubmission` schema with **partial unique index on `(userId, bootcampId)` filtered by status ∈ {pending_verification, approved}**. Allows resubmit after rejection. Critical.
3. **`expectedAmountInPaise` stored on submission** so a future price change doesn't retroactively flag old submissions as wrong amount.
4. UTR normalised to **uppercase + 12-char regex** on input.
5. **Approval transaction** — submission status update + user enrollment write in a single Mongoose session. Don't change this.
6. Google Cloud **service account with domain-wide delegation, Calendar scope only**. Impersonate `admin@unghost.in`.
7. **"Only invited people can join"** at Workspace admin level — this is the primary anti-sharing defense, not the device check.
8. `sendUpdates: 'none'` on Calendar event create — students see Meet URL inside our dashboard, not in their inbox.
9. Daily cron runs **18:30 UTC = midnight IST**, generates tomorrow's events.
10. **15-min pre-start gate** on Join button + **30-min post-start cutoff** on Join API.
11. **Concurrent device check via Redis with 10-min TTL**, IP + fingerprint stored separately.
12. `AbuseFlag` model with `type` enum + admin dashboard at `/admin/abuse`.
13. **10-test acceptance checklist** at the end — runs verbatim.

---

## What CHANGES from the PDF — detailed

### 1. SMS → Email only

**PDF:** MSG91 sends transactional SMS at three trigger points (received, approved, rejected).
**Revised:** Resend sends email at the same three trigger points. SMS dropped entirely.

**New email templates** (add to `server/integrations/email/index.ts` matching existing `sendVerifyEmail` / `sendPasswordReset` pattern):

| Function | Trigger | Subject |
|---|---|---|
| `sendPaymentReceived(to, { name, bootcampTitle })` | On `/api/enrollments` POST success | "We received your payment for {bootcamp}" |
| `sendEnrollmentApproved(to, { name, bootcampTitle, dashboardUrl })` | On admin approve | "You're enrolled in {bootcamp}" |
| `sendEnrollmentRejected(to, { name, bootcampTitle, reason })` | On admin reject | "We couldn't verify your payment for {bootcamp}" |

Mobile field on the submission is still collected (for ops outreach) but no SMS fires.

**Env vars removed:** `MSG91_AUTH_KEY`, `MSG91_SENDER_ID`, `MSG91_TEMPLATE_*`.

---

### 2. Bootcamp model — extend, don't duplicate

**Current schema** (`server/db/models.ts:251`):
```ts
{ _id: String, skill, category, title, description, priceINR: Number,
  durationWeeks, instructorId, videos[], liveSlots: [String],
  enrolledStudentIds: [String], rating, coverColor, status, ... }
```

**Add fields** (non-breaking — existing docs keep working):
```ts
priceInPaise: Number,         // new authoritative price (paise). priceINR deprecated, kept for backwards read.
gstPercent: { type: Number, default: 18 },
enrollmentOpensAt: Date,
enrollmentClosesAt: Date,
startsAt: Date,
endsAt: Date,
maxStudents: { type: Number, default: 495 },
sessions: [{
  _id: { type: String, required: true },
  title: String,
  scheduledFor: Date,
  durationMinutes: { type: Number, default: 90 },
  meetUrl: { type: String, default: null },
  calendarEventId: { type: String, default: null },
  recordingUrl: { type: String, default: null },  // manual upload field, see §9
}],
```

**Migration:** one-time script — for each existing Bootcamp, set `priceInPaise = priceINR * 100`, leave dates null (admin fills before publish), generate one default session if `liveSlots` non-empty.

**Why not new file:** Mongoose only allows one `model('Bootcamp', ...)` call. A second file would throw `OverwriteModelError`.

---

### 3. Cron via Vercel, not Inngest

**Add to `vercel.json`:**
```json
{
  "crons": [
    { "path": "/api/cron/create-tomorrow-meets", "schedule": "30 18 * * *" }
  ]
}
```

**New route** `app/api/cron/create-tomorrow-meets/route.ts`:
- Verifies `Authorization: Bearer ${CRON_SECRET}` header (Vercel sends this automatically when cron fires).
- Same logic as PDF page 23: fetch tomorrow's bootcamps with sessions, get paid roster emails, call `createMeetEventForSession` per session that lacks a `meetUrl`.
- Wraps each session in try/catch — one failure doesn't break the rest.

**Manual backfill:** add admin button "Regenerate Meet URL" per session row that hits same logic for one session.

---

### 4. Admin gate fix

**Every API route** the PDF gives uses:
```ts
if (!session?.roles?.includes('admin')) return 403
```
**Replace with:**
```ts
if (session?.user?.role !== 'admin') return 403
```

Audit all five new routes the PDF introduces (`/api/admin/payment-submissions/[id]/{approve,reject,flag}`, `/api/admin/abuse/[id]/{ignore,warn,terminate}`).

---

### 5. Capacity atomicity

**PDF approach (broken under concurrency):**
```ts
const count = await PaymentSubmissionModel.countDocuments({ bootcampId, status: { $in: ['pending_verification', 'approved'] } });
if (count >= maxStudents) return 400;
await PaymentSubmissionModel.create({ ... });
```

**Revised — Mongo `findOneAndUpdate` with `$inc` slot counter:**

Add to bootcamp: `currentSubmissionCount: { type: Number, default: 0 }`.

Submission flow:
```ts
const incremented = await BootcampModel.findOneAndUpdate(
  { _id: bootcampId, currentSubmissionCount: { $lt: maxStudents } },
  { $inc: { currentSubmissionCount: 1 } },
  { new: true },
);
if (!incremented) return 400 'full';
try {
  await PaymentSubmissionModel.create({ ... });
} catch (err) {
  // Roll back the increment on submission insert failure (e.g. duplicate UTR)
  await BootcampModel.updateOne({ _id: bootcampId }, { $inc: { currentSubmissionCount: -1 } });
  throw err;
}
```

On reject (admin), decrement `currentSubmissionCount` so a rejected slot frees up.
On approve, no change (already counted).

This is atomic at the DB level — no transaction needed, no race.

---

### 6. Idempotency on enrollment POST

Client generates a UUID, sends as `Idempotency-Key: <uuid>` header. Server stores `(userId, idempotencyKey) → submissionId` in Redis for 24h. On retry with same key → return the original submission, status 200. Standard Stripe-style pattern.

Cost: one Redis SET + one Redis GET per submission. Negligible.

---

### 7. Rate limit on `/api/sessions/[id]/join`

Add per-IP token bucket via Upstash:
- 10 requests / minute / IP — burst tolerant, blocks scrapers.
- Already have Upstash configured. Use `@upstash/ratelimit` (small dep) or roll our own with `redis.incr` + TTL.

Same protection on `/api/enrollments` POST — 5 / minute / IP.

---

### 8. Meet recording — clarify it's manual

**PDF stores `recordingUrl` on sessions**, implying auto-population. Free Google Workspace and Business Starter tiers **do not auto-record Meet sessions**. Business Plus is $18/user/mo.

**Revised:** keep the field, but it stays null. Add admin UI "Upload recording link" per session row — instructor pastes a YouTube/Drive/R2 URL post-session. This matches your "record on Zoom, post on platform" decision from earlier conversation.

If you later upgrade to Workspace Business Plus, the cron can be extended to poll Drive for the recording file and auto-populate. Add a TODO comment for that path.

---

### 9. Abuse alerting — per-flag webhook, not daily digest

**Drop:** the daily Slack digest cron at 9am.
**Add:** inline call to `notifyAdminSlack` inside `flagConcurrentAttempt` so every flag pings #admin-alerts in real time. One line.

Rationale: at v1 volume (cohort 1 = ~50 students) you'll have 0-5 flags/day. A daily digest hides the timing; real-time alert lets you investigate immediately.

---

### 10. AbuseFlag.metadata typed per `type`

**PDF:** `metadata: Schema.Types.Mixed`.
**Revised:** typed union via TypeScript at the helper level, schema stays Mixed but the create-helper signature enforces shape:

```ts
type ConcurrentDeviceMeta = {
  currentFingerprint: string; existingFingerprint: string;
  currentIp: string; existingIp: string | null;
};
type DuplicateUtrMeta = { utr: string; conflictingUserIds: string[] };
type UnauthorizedJoinMeta = { reason: 'not_enrolled' | 'wrong_session' };
```

This keeps queryability via dot-notation (e.g. `metadata.currentIp`) while letting Mongoose store flexibly.

---

### 11. Price helper — single source

New file `server/payments/pricing.ts`:
```ts
export function computeTotalPaise(b: { priceInPaise: number; gstPercent: number }): {
  baseInPaise: number; gstInPaise: number; totalInPaise: number;
} {
  const gstInPaise = Math.round((b.priceInPaise * b.gstPercent) / 100);
  return { baseInPaise: b.priceInPaise, gstInPaise, totalInPaise: b.priceInPaise + gstInPaise };
}
export const paiseToRupees = (p: number) => p / 100;
```

Used by: enroll page display, submission API validation, approval email merge vars.

---

### 12. PhonePe deep-link from admin row

Each row in the approval queue gets a "Verify in PhonePe ↗" button that opens:
```
https://business.phonepe.com/transactions?search=<UTR>
```
(or whatever the merchant portal search URL pattern is — confirm during impl).

Admin still verifies manually. Just saves them from typing/pasting the UTR.

---

## What we ADD (gaps the PDF didn't cover)

1. **Migration script** — `scripts/migrate-bootcamps-to-paise.ts`. Run once.
2. **Admin "regenerate Meet URL" action** — for cron failures.
3. **Admin "upload recording URL" form** — per session row.
4. **Idempotency middleware** — shared helper for any POST that creates a row.
5. **Vercel Cron auth check** — verify `CRON_SECRET` so the cron route isn't publicly callable.
6. **`computeTotalPaise` unit tests** — catch GST off-by-one.
7. **Cron failure email to admin** — if more than 50% of tomorrow's sessions failed to provision, send an alert email immediately.

---

## What we REMOVE (scope cut)

1. **MSG91 — entire SMS path.** Templates, helper, env vars, status integration.
2. **Inngest** — never installed; not adding.
3. **Daily abuse digest cron** — replaced by per-flag webhook.

---

## Revised acceptance criteria

Same 10 items from PDF page 33 with these edits:

- ✏️ **System A — Email templates** (was: All three MSG91 templates) — three Resend templates live + dispatched on the right triggers.
- ✏️ **System A — Submission API** — adds capacity atomicity test (10 concurrent submissions to a `maxStudents: 5` bootcamp → exactly 5 succeed).
- ➕ **System A — Idempotency** — same `Idempotency-Key` + same body returns the same submission.
- ✏️ **System B — Daily cron** triggered via Vercel Cron (not Inngest dashboard).
- ➖ **System B — Daily Slack digest** removed; replaced by:
- ➕ **System B — Per-flag Slack alert** — every concurrent-device flag fires `notifyAdminSlack` in real time.
- ➕ **System B — Admin "Regenerate Meet" + "Upload recording"** actions present on session rows.
- ➕ **Pricing helper** — `computeTotalPaise` unit tests pass.

---

## Revised execution order (one mid-level dev)

| Phase | Days | Output |
|---|---|---|
| **0 · Pre-work** | 0.5 | Migration script written + dry-run against staging Atlas. Resend templates drafted + reviewed. PhonePe merchant portal URL confirmed. |
| **1 · Data + pricing** | 1 | Bootcamp schema extended. `PaymentSubmission` model. `computeTotalPaise` helper + tests. Migration run. |
| **2 · Enrollment flow** | 2 | Enroll page (QR + form). Submission API with capacity atomicity + idempotency + rate limit. `sendPaymentReceived` email. |
| **3 · Admin verification** | 1.5 | `/admin/payment-approvals` page. Approve/reject/flag APIs. Transaction-wrapped approval. Approved/rejected emails. PhonePe deep-link. |
| **4 · Google Workspace + Calendar helper** | 1.5 | Cloud project, service account, DWD, scope. `createMeetEventForSession` helper. Manual test via script. |
| **5 · Vercel Cron + Meet provisioning** | 1 | `/api/cron/create-tomorrow-meets` route + `vercel.json` cron entry. Admin "Regenerate" button. |
| **6 · Gated Join flow** | 1.5 | FingerprintJS install. JoinSessionButton. `/api/sessions/[id]/join` with auth + enrollment + timing + concurrent device check + rate limit. |
| **7 · Abuse model + dashboard + alerts** | 1 | `AbuseFlag` model. `/admin/abuse` page. Per-flag Slack webhook. |
| **8 · Acceptance tests** | 0.5 | All 10 tests + the 3 new ones. Fix gaps. |
| **Total** | **~10 days** | Matches PDF estimate. |

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Google DWD setup blocked by Workspace admin policy | Medium | Verify access on day 1 of Phase 4 — if blocked, escalate before code starts |
| Vercel Cron unreliable (free tier has been flaky historically) | Low-Med | Add admin "regenerate" button as backup (already in plan). Monitor via cron-failure email. |
| FingerprintJS open-source gameable | High | Acknowledged. Workspace "Only invited people" is the real defense. Upgrade to Pro post-cohort-1 if abuse observed. |
| Mongo `findOneAndUpdate` capacity check has subtle bug | Low | Concurrency test (10 parallel submits to `maxStudents: 5`) in CI. |
| Admin approves their own friend in waitroom | Low | Procedural. Document in admin runbook. |
| Student forwards their entire account credentials | Low | Out of scope. Account sharing is broader problem; flag for cohort 2. |

---

## Approval needed

Reply with one of:
- **"Approve as written"** → I start Phase 0 immediately.
- **"Approve with these changes: ..."** → I update this doc, then start.
- **"Hold on X"** → tell me what to clarify before approval.

Once approved, I'll work phase-by-phase and check in with you at each phase boundary.
