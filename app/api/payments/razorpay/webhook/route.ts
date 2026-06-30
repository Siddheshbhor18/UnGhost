import { NextResponse } from "next/server";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { logger } from "@/server/lib/logger";
import { verifyWebhookSignature } from "@/server/integrations/payments/razorpay";
import {
  fulfilPremiumPurchase,
  premiumAnnualPricing,
  fulfilJobsPlan,
  jobsPlanPricing,
} from "@/server/payments/subscription";
import {
  fulfilCoursePurchase,
  coursesPricing,
} from "@/server/payments/courses";
import { reverseRewardByPayment } from "@/server/creator/reward.service";
import { z } from "zod";

/**
 * Refund / dispute payload shape — only the fields we need to find the original
 * payment id. Parsed with Zod because it's untrusted external input.
 */
const ReversalEvent = z.object({
  event: z.string(),
  payload: z
    .object({
      refund: z
        .object({ entity: z.object({ payment_id: z.string() }) })
        .optional(),
      payment: z.object({ entity: z.object({ id: z.string() }) }).optional(),
    })
    .optional(),
});

export const runtime = "nodejs";
// Never cache; every request is a unique signed event.
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/razorpay/webhook
 *
 * Razorpay's server-to-server notification — the authoritative fulfilment
 * path. Even if the user closes the tab the instant after paying (so the
 * browser /verify call never fires), this still grants their plan.
 *
 * Security:
 *   - Verifies `X-Razorpay-Signature` against the RAW body using the webhook
 *     secret. Unsigned/forged calls get 400 and do nothing.
 *   - Re-derives the expected price server-side and rejects under-payments.
 *   - Fulfilment is idempotent (shared `fulfilPremiumPurchase`), so Razorpay's
 *     at-least-once retries and the browser callback never double-grant.
 *
 * Configure in the Razorpay dashboard → Webhooks: URL
 * `https://<app>/api/payments/razorpay/webhook`, secret = RAZORPAY_WEBHOOK_SECRET,
 * events: `payment.captured` (and optionally `payment.authorized`).
 *
 * No CSRF / same-origin check here — the caller is Razorpay, not a browser;
 * the HMAC signature is the auth.
 */
async function postHandler(req: Request) {
  // Must read the raw text — re-stringifying parsed JSON would change bytes
  // and break the HMAC.
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    logger.warn("razorpay.webhook-bad-signature");
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: RazorpayPaymentEntity } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  // Refund / chargeback from Razorpay's side → reverse the creator reward
  // (loophole §9.2). Idempotent + a no-reward/already-terminal case is a no-op.
  // ACK with the ACTUAL outcome — older code returned `reversed: <event-name>`
  // even when the payload was malformed and no reversal ran (Bug 4 fix).
  const evName = event.event ?? "";
  if (evName.startsWith("refund.") || evName.startsWith("payment.dispute")) {
    const parsed = ReversalEvent.safeParse(event);
    const paymentId =
      parsed.data?.payload?.refund?.entity.payment_id ??
      parsed.data?.payload?.payment?.entity.id;
    if (!paymentId) {
      logger.warn(
        { evName, parseOk: parsed.success },
        "razorpay.webhook-reversal-no-payment-id",
      );
      return NextResponse.json({
        ok: true,
        reversed: false,
        reason: "no_payment_id",
        event: evName,
      });
    }
    const kind = evName.startsWith("payment.dispute")
      ? "chargeback"
      : "refund";
    const result = await reverseRewardByPayment({
      paymentId,
      kind,
      reason: evName,
      actor: { actorType: "webhook" },
    });
    return NextResponse.json({
      ok: true,
      reversed: result.reversed,
      event: evName,
    });
  }

  // Only act on a successful capture. ACK everything else with 200 so
  // Razorpay stops retrying events we intentionally ignore.
  const handled =
    event.event === "payment.captured" || event.event === "payment.authorized";
  const payment = event.payload?.payment?.entity;
  if (!handled || !payment) {
    return NextResponse.json({ ok: true, ignored: event.event ?? "unknown" });
  }

  const userId = payment.notes?.userId;
  if (!userId) {
    return NextResponse.json({ ok: true, skipped: "no_user_note" });
  }
  const kind = payment.notes?.kind;
  const orderId = payment.order_id ?? `noorder_${payment.id}`;
  const underpaid = (expectedPaise: number) => payment.amount < expectedPaise;

  if (kind === "jobs") {
    const plan = payment.notes?.plan;
    if (plan !== "jobs_quarterly" && plan !== "jobs_annual") {
      return NextResponse.json({ ok: true, skipped: "bad_plan" });
    }
    if (underpaid(jobsPlanPricing(plan).totalInPaise)) {
      return NextResponse.json({ ok: true, refused: "amount_mismatch" });
    }
    await fulfilJobsPlan({
      provider: "razorpay",
      paymentId: payment.id,
      orderId,
      userId,
      plan,
      amountPaise: payment.amount,
      via: "webhook",
    });
    return NextResponse.json({ ok: true });
  }

  if (kind === "courses") {
    const courses = (payment.notes?.courses ?? "").split(",").filter(Boolean);
    if (underpaid(coursesPricing(courses).totalInPaise)) {
      return NextResponse.json({ ok: true, refused: "amount_mismatch" });
    }
    await fulfilCoursePurchase({
      provider: "razorpay",
      paymentId: payment.id,
      orderId,
      userId,
      courses,
      amountPaise: payment.amount,
      via: "webhook",
    });
    return NextResponse.json({ ok: true });
  }

  // Legacy premium (grandfather / in-flight).
  if (payment.notes?.plan !== "premium") {
    logger.info({ paymentId: payment.id }, "razorpay.webhook-unknown-order");
    return NextResponse.json({ ok: true, skipped: "unknown_order" });
  }
  if (underpaid(premiumAnnualPricing(payment.notes?.coupon).totalInPaise)) {
    return NextResponse.json({ ok: true, refused: "amount_mismatch" });
  }
  await fulfilPremiumPurchase({
    provider: "razorpay",
    paymentId: payment.id,
    orderId,
    userId,
    amountPaise: payment.amount,
    via: "webhook",
  });
  return NextResponse.json({ ok: true });
}

interface RazorpayPaymentEntity {
  id: string;
  order_id: string | null;
  amount: number;
  status: string;
  notes?: Record<string, string>;
}

export const POST = withApiErrorTracking(postHandler);
