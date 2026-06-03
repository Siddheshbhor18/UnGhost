/**
 * POST /api/billing/manual-payment
 *
 * Student submits proof of QR/UPI payment for a subscription plan.
 * Creates a PaymentSubmission record with status "pending_verification".
 * Admin verifies in /admin/payment-approvals → approve activates plan.
 *
 * Body: { plan, transactionId, upiApp, payerName, payerMobile }
 *
 * Sends confirmation email to student + Slack notification to ops.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { connectMongo } from "@/server/db/mongo";
import { PaymentSubmissionModel, UserModel } from "@/server/db/models";
import { sendPaymentReceived } from "@/server/integrations/email";
import { computeTotalPaise } from "@/server/payments/pricing";
import {
  PLAN_PRICING,
  PREMIUM_GST_PERCENT,
  PREMIUM_LIFETIME_SEATS,
} from "@/shared/types";
import { countPremiumUsers } from "@/server/store";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

const Input = z.object({
  plan: z.enum(["premium"]),
  transactionId: z.string().min(4).max(100).trim(),
  upiApp: z.enum(["phonepe", "gpay", "paytm", "bhim", "other"]),
  payerName: z.string().min(2).max(100).trim(),
  payerMobile: z
    .string()
    .regex(/^\d{10}$/, "10-digit mobile number required"),
});

/**
 * We reuse the PaymentSubmission model but set bootcampId to a synthetic
 * value like "plan:premium" since the model requires it.
 * The admin approval route handles both bootcamp and plan submissions.
 */
async function postHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;

  const { plan, transactionId, upiApp, payerName, payerMobile } = parsed.data;
  const pricing = PLAN_PRICING[plan];

  await connectMongo();

  // Launch offer: ₹4,999 lifetime is capped at the first N premium buyers.
  const buyer = await UserModel.findById(session.user.id).select("plan").lean();
  if (buyer?.plan !== "premium") {
    const premiumCount = await countPremiumUsers();
    if (premiumCount >= PREMIUM_LIFETIME_SEATS) {
      return NextResponse.json(
        {
          error: "offer_closed",
          reason: `The lifetime offer is sold out (limited to the first ${PREMIUM_LIFETIME_SEATS} members).`,
        },
        { status: 409 },
      );
    }
  }

  // Check for duplicate active submission for same plan
  const existing = await PaymentSubmissionModel.findOne({
    userId: session.user.id,
    bootcampId: `plan:${plan}`,
    status: { $in: ["pending_verification", "flagged"] },
  });

  if (existing) {
    return NextResponse.json(
      {
        error: "duplicate",
        reason:
          "You already have a pending payment for this plan. We're verifying it — you'll get an email once activated.",
      },
      { status: 409 },
    );
  }

  // Update user's name + phone if provided (useful for verification)
  await UserModel.updateOne(
    { _id: session.user.id },
    {
      $set: {
        name: payerName,
        "profile.contactPhone": payerMobile,
      },
    },
  );

  const submission = await PaymentSubmissionModel.create({
    _id: crypto.randomUUID(),
    userId: session.user.id,
    bootcampId: `plan:${plan}`, // synthetic — identifies this as a plan purchase
    expectedAmountInPaise: computeTotalPaise({
      priceInPaise: pricing.amountINR * 100,
      gstPercent: PREMIUM_GST_PERCENT,
    }).totalInPaise,
    utr: transactionId.toUpperCase(),
    upiApp,
    payerMobile,
    status: "pending_verification",
  });

  // Send confirmation email (fire-and-forget)
  const user = await UserModel.findById(session.user.id)
    .select("email name")
    .lean();

  if (user?.email) {
    sendPaymentReceived(user.email, {
      name: payerName,
      bootcampTitle: `unGhost ${pricing.label} plan`,
      utr: transactionId.toUpperCase(),
    }).catch((err: unknown) =>
      logger.error(
        { err, submissionId: submission._id },
        "manual-payment.email_failed",
      ),
    );
  }

  logger.info(
    {
      submissionId: submission._id,
      userId: session.user.id,
      plan,
      amount: pricing.amountINR,
      transactionId,
    },
    "manual-payment.submitted",
  );

  return NextResponse.json({
    ok: true,
    submissionId: submission._id,
    message: "Payment submitted for verification",
  });
}

export const POST = withRateLimit(
  { bucket: "billing.manual", limit: 5, windowSec: 300, by: "user" },
  withApiErrorTracking(postHandler),
);
