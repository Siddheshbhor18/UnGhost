import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { logger } from "@/server/lib/logger";
import {
  verifyPaymentSignature,
  fetchPayment,
} from "@/server/integrations/payments/razorpay";
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

export const runtime = "nodejs";

const Input = z.object({
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

/**
 * POST /api/payments/razorpay/verify
 *
 * Called by the browser right after a successful checkout. It does NOT trust
 * the browser's "success" — it:
 *   1. Recomputes the HMAC signature (order_id|payment_id) and constant-time
 *      compares it. Mismatch → 400, nothing granted.
 *   2. Re-reads the payment from Razorpay (status must be captured/authorized,
 *      order id must match).
 *   3. Confirms the buyer in the payment's notes is THIS session user, and the
 *      captured amount equals the expected annual price (no under-payment).
 *   4. Fulfils idempotently (shared with the webhook).
 *
 * The webhook is the ultimate source of truth (it fires even if the browser
 * dies here); this route just makes the happy path instant for the user.
 */
async function postHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    parsed.data;

  // 1. Signature.
  const sigOk = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!sigOk) {
    logger.warn(
      { userId: session.user.id, orderId: razorpay_order_id },
      "razorpay.verify-signature-mismatch",
    );
    return NextResponse.json(
      { verified: false, error: "signature_mismatch" },
      { status: 400 },
    );
  }

  // 2. Re-read the payment from Razorpay (source of truth).
  const payment = await fetchPayment(razorpay_payment_id);
  if (
    !payment ||
    payment.order_id !== razorpay_order_id ||
    (payment.status !== "captured" && payment.status !== "authorized")
  ) {
    logger.warn(
      { userId: session.user.id, paymentId: razorpay_payment_id, status: payment?.status },
      "razorpay.verify-payment-not-captured",
    );
    return NextResponse.json(
      { verified: false, error: "payment_not_confirmed" },
      { status: 400 },
    );
  }

  // 3. Buyer + amount must match what we issued the order for.
  const buyerId = payment.notes?.userId;
  if (buyerId && buyerId !== session.user.id) {
    logger.warn(
      { sessionUser: session.user.id, buyerId, paymentId: razorpay_payment_id },
      "razorpay.verify-buyer-mismatch",
    );
    return NextResponse.json(
      { verified: false, error: "buyer_mismatch" },
      { status: 403 },
    );
  }
  // 3b. Branch fulfilment on the order kind echoed in the payment notes.
  const notes = payment.notes ?? {};
  const fail = (error: string, status = 500) =>
    NextResponse.json({ verified: false, error }, { status });

  if (notes.kind === "jobs") {
    const plan = notes.plan;
    if (plan !== "jobs_quarterly" && plan !== "jobs_annual") {
      return fail("bad_plan", 400);
    }
    if (payment.amount < jobsPlanPricing(plan).totalInPaise) {
      return fail("amount_mismatch", 400);
    }
    const result = await fulfilJobsPlan({
      provider: "razorpay",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      userId: session.user.id,
      plan,
      amountPaise: payment.amount,
      via: "callback",
    });
    return result.ok ? NextResponse.json({ verified: true }) : fail(result.reason);
  }

  if (notes.kind === "courses") {
    const courses = (notes.courses ?? "").split(",").filter(Boolean);
    if (payment.amount < coursesPricing(courses).totalInPaise) {
      return fail("amount_mismatch", 400);
    }
    const result = await fulfilCoursePurchase({
      provider: "razorpay",
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      userId: session.user.id,
      courses,
      amountPaise: payment.amount,
      via: "callback",
    });
    return result.ok ? NextResponse.json({ verified: true }) : fail(result.reason);
  }

  // Legacy premium (grandfather / in-flight orders only).
  if (payment.amount < premiumAnnualPricing(notes.coupon).totalInPaise) {
    return fail("amount_mismatch", 400);
  }
  const result = await fulfilPremiumPurchase({
    provider: "razorpay",
    paymentId: razorpay_payment_id,
    orderId: razorpay_order_id,
    userId: session.user.id,
    amountPaise: payment.amount,
    via: "callback",
  });
  return result.ok ? NextResponse.json({ verified: true }) : fail(result.reason);
}

export const POST = withRateLimit(
  { bucket: "razorpay.verify", limit: 30, windowSec: 300, by: "user" },
  withApiErrorTracking(postHandler),
);
