# Razorpay — Go-live runbook

End-to-end checklist to flip Razorpay from test mode (`rzp_test_*`) to live
mode (`rzp_live_*`) for course + jobs-plan purchases. The code already runs
identically in both modes; this is provisioning + paste + smoke.

## 0. Policy reality check — read this FIRST

The platform is **non-refundable** ("All sales final" — see `app/refund-policy/page.tsx`).
The Razorpay integration here is NOT a self-service refund tool and there is
no buyer-facing "Refund me" button. The admin refund route
(`/api/admin/billing/refund`) exists for **three exceptional cases the
published refund policy explicitly carves out** and nothing else:

| `correctionKind`        | What it means                                              | Default `revokePlan` |
|-------------------------|------------------------------------------------------------|----------------------|
| `duplicate_charge`      | Buyer paid twice (modal race, double-click). Refund the duplicate. | **false** — buyer keeps the access they paid for once. |
| `unauthorized_charge`   | Card used by someone else (account takeover, stolen card). | **true** — purchase shouldn't have happened. |
| `dispute_settlement`    | Chargeback follow-up, RBI directive, legal settlement.     | **true** — admin can override. |

The route enforces this contract: `correctionKind` is REQUIRED, `reason`
must be ≥10 chars, and the rate limit is tight (10/hour/admin) because a
bursty pattern means something upstream is wrong.

**Separately**, the webhook path (`refund.processed`,
`payment.dispute.lost`) handles refunds initiated OUTSIDE this route —
chargebacks filed by the buyer's bank, or refunds an ops person clicked in
the Razorpay dashboard directly. This must remain enabled regardless of
refund policy because **creator commissions cannot stay paid on money that
left the platform's bank account**. That's accounting, not policy.

Recruiter-sponsorship pre-acceptance refunds (policy §3) live in a separate
code path and are out of scope for this runbook.


Owners: Eng (deploy) + Ops (Razorpay dashboard) + Finance (KYC).

---

## 1. Keys you MUST have in production env

All keys are server-only **except** `NEXT_PUBLIC_RAZORPAY_KEY_ID` which is
baked into the client bundle so `checkout.js` knows which merchant to talk
to. Set every variable in Vercel → Project → Settings → Environment Variables
(Production), then redeploy.

| Variable                          | Where it comes from                              | Sensitivity   | Required |
|-----------------------------------|--------------------------------------------------|---------------|----------|
| `RAZORPAY_KEY_ID`                 | Dashboard → Account & Settings → API Keys        | Server-secret | YES      |
| `RAZORPAY_KEY_SECRET`             | Dashboard → Account & Settings → API Keys        | Server-secret | YES      |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID`     | Same as `RAZORPAY_KEY_ID` (live `rzp_live_*`)    | Public        | YES      |
| `RAZORPAY_WEBHOOK_SECRET`         | Dashboard → Webhooks → (create) → Secret         | Server-secret | YES      |
| `NEXT_PUBLIC_APP_URL`             | `https://unghost.in` (origin used in `/r/<code>`)| Public        | YES      |
| `MONGODB_URI`                     | Atlas prod cluster URI                           | Server-secret | YES      |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET`| Auth domain + 32-byte secret                     | Server-secret | YES      |
| `CRON_SECRET`                     | 32-byte secret for `/api/cron/*` auth            | Server-secret | YES      |
| `UPSTASH_REDIS_REST_URL/TOKEN`    | Upstash Redis prod (rate limits + OTP)           | Server-secret | YES      |

### Important — DO NOT confuse the two secrets

- `RAZORPAY_KEY_SECRET` is the **API** secret. Used as Basic-auth password to
  call `api.razorpay.com` (create order, fetch payment, issue refund) and to
  HMAC the payment signature on `/api/payments/razorpay/verify`.
- `RAZORPAY_WEBHOOK_SECRET` is a **separate** secret you choose when creating
  the webhook in the dashboard. Used only to HMAC the raw webhook body
  against `X-Razorpay-Signature` on `/api/payments/razorpay/webhook`.

A typo that swaps them silently fails all webhook signature checks → no
fulfilment from the S2S path.

---

## 2. Webhook setup

In the Razorpay dashboard (Account & Settings → Webhooks → + Add New Webhook):

- **URL** — `https://unghost.in/api/payments/razorpay/webhook`
- **Secret** — strong random (e.g. `openssl rand -hex 32`). Paste the SAME
  value into the `RAZORPAY_WEBHOOK_SECRET` env var.
- **Alert email** — engineering on-call list.
- **Active events** — subscribe to exactly these:
  - `payment.captured` — primary fulfilment trigger.
  - `payment.authorized` — pre-capture state; we ACK + fulfil idempotently
    so a delayed `.captured` doesn't double-grant.
  - `payment.failed` — currently ACKed (no action). Future: surface to admin.
  - `refund.processed` — reverses the creator reward end-to-end.
  - `refund.failed` — currently ACKed; admin will see it in the gateway UI.
  - `payment.dispute.created` / `payment.dispute.won` / `payment.dispute.lost`
    — chargeback handling. `lost` reverses the reward.

Anything not listed will be 200-ACKed by the route (`{ ignored: <event> }`)
so Razorpay stops retrying. Subscribing to extras = wasted bandwidth, not a
correctness problem.

### Why the order matters

The browser `/verify` path is best-effort (the user might close the tab the
moment they see "Success"). The webhook is the **authoritative** fulfilment
trigger; it can re-deliver for up to 24h with exponential backoff if we
return a non-2xx. That's why every fulfilment helper is idempotent on the
unique `ProcessedTxn._id = paymentId` index.

---

## 3. Pre-cutover checklist

- [ ] Razorpay merchant account is fully KYC-approved (settlements enabled).
- [ ] Live keys (`rzp_live_*`) generated and read once into a password manager.
- [ ] Webhook created, secret captured.
- [ ] All env vars above set in Vercel **Production** scope.
- [ ] Preview deploy redeployed to inherit env (`vercel --prod` or push to main).
- [ ] `/admin/integrations` (or equivalent) shows Razorpay "Live".
- [ ] `/api/health` is 200.
- [ ] Vercel Cron entries present (`/api/cron/reward-reconcile` daily 06:00 UTC,
      `/api/cron/referral-session-sweep` daily 05:00 UTC).
- [ ] Sentry release tag created for this deploy.

---

## 4. Smoke test (10 minutes, real money — refund after)

Run on a brand-new student account so you cleanly exercise the referral path.

1. **Referral attribution**
   - Visit `https://unghost.in/r/<a-known-active-creator-code>`. Confirm
     redirect to `/` and Chrome devtools → Application → Cookies shows
     `ug_ref` (HttpOnly, Secure, SameSite=Lax).
2. **Signup**
   - Complete signup. In the DB: `users.<id>.referredByCreatorId` should be
     the creator's id; `creatorEvents` should hold a `referral.converted`
     row.
3. **Buy ONE course (e.g. AI ₹5,900 incl. GST)**
   - Open `/bootcamps/checkout?course=ai`. Click "Buy courses". Razorpay
     modal opens.
   - Pay with UPI or test card `4111 1111 1111 1111` if Razorpay test cards
     are enabled in live mode (they aren't — use a real ₹5,900 charge).
4. **Verify post-conditions**
   - Redirected to `?success=1`, cart cleared.
   - `users.<id>.ownedCourses` contains the AI + free-unlocks (marketing /
     sales / entrepreneurship), each with an expiry ~90 days out.
   - `processed_txns` has one row keyed on the Razorpay payment id.
   - `creator_rewards` has one row, status `pending`, calculated against
     the creator's commission rate.
   - `credit_ledger` has the matching `credit` entry. Creator balance moved.
   - Razorpay dashboard → Payments shows status `captured`.
   - Webhook dashboard shows `payment.captured` delivered with 200.
5. **Refund the smoke charge (mandatory cleanup — exception path)**
   - Even with the no-refund policy, the smoke test is a legitimate
     `dispute_settlement` (you charged yourself to verify the system).
   - POST `/api/admin/billing/refund` as admin with:
     `{"userId":"<smoke-account>","originalTxnId":"<pay_id>","amountPaise":<full-amount>,"reason":"go-live smoke test","correctionKind":"dispute_settlement"}`
   - Confirm `processed_txns` has a second row with negative amount.
   - Confirm the reward is now `reversed` and creator balance is back to 0.
   - Razorpay dashboard → Refunds shows `processed`.
   - Webhook `refund.processed` delivered with 200 (it would also reverse
     the reward; idempotent — already-terminal returns `already_terminal`).

If any step fails, **do not roll out to users**. Go to §6 rollback.

---

## 5. Production monitoring

What to watch in the first 24h:

- Sentry: any new errors tagged with `razorpay.*` log keys
  (`razorpay.verify-signature-mismatch`, `razorpay.webhook-bad-signature`,
  `razorpay.fulfil-activated`, `creator.reward-hook-failed`).
- Razorpay dashboard → Webhooks → Delivery log: expect ~100% 2xx. A spike of
  4xx means signature drift (wrong `RAZORPAY_WEBHOOK_SECRET`).
- `/api/cron/reward-reconcile` daily output (`logger.info("reward-reconcile completed")`).
  `created` should usually be 0; a non-zero number means the inline reward
  hook failed for some purchases and reconciliation caught up.

---

## 6. Rollback (if smoke test or first hour goes sideways)

1. In Vercel → Deployments → "Promote to Production" the last green deploy
   from before the cutover.
2. In Razorpay dashboard → Webhooks: leave the live webhook active. The
   rolled-back code still handles `payment.captured` (live mode is just an
   env-vars flip; behavior is the same). If you're unsure, **disable** the
   webhook to stop retries until you re-deploy.
3. Issue refunds for any successful captures that didn't reach the user
   (search `processed_txns` for the window).
4. Sentry: triage the failure mode.
5. Re-attempt go-live after the fix.

---

## 7. Why each defense exists (auditor's eye)

| Defense                                          | What it stops                                                                                  |
|--------------------------------------------------|------------------------------------------------------------------------------------------------|
| HMAC on `/verify` (`order_id\|payment_id`)       | A user replaying someone else's payment id from their browser console.                         |
| HMAC on `/webhook` over raw body                 | A forged S2S call (anyone can `POST` your webhook URL).                                        |
| Constant-time signature compare                  | Timing oracle that would otherwise let an attacker extract the secret one byte at a time.      |
| Re-read payment from Razorpay in `/verify`       | A racing tab that finished payment with the wrong amount or against a foreign order.           |
| `payment.notes.userId === session.user.id`       | Cross-user replay: signed-in user A submitting user B's successful payment to grant themselves.|
| Server-side price (`coursesPricing`/`jobsPlanPricing`) | Tampered client posting a ₹1 cart to a real ₹5,900 course.                               |
| `amount >= expected` re-check in webhook         | An order modified mid-flight (rare on Razorpay, but defense in depth).                         |
| `ProcessedTxn._id = paymentId` unique index      | Verify + webhook race; webhook retries; refund flow re-submission.                             |
| Reward unique index on `paymentId`               | Two webhook deliveries minting two creator commissions for one sale.                           |
| Cron `/api/cron/reward-reconcile`                | A `checkAndCreateReward` blip silently swallowing a reward — daily reconciliation re-creates.  |
| Cron `/api/cron/referral-session-sweep`          | Active referral sessions piling up forever; attribution itself keys off `expiresAt`.           |

---

## 8. Quick env-var template (copy into Vercel)

```bash
# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=$(openssl rand -hex 32)

# Origin baked into client bundle
NEXT_PUBLIC_APP_URL=https://unghost.in

# Auth + crons
NEXTAUTH_URL=https://unghost.in
NEXTAUTH_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 32)
```
