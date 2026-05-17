import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getPaymentStatus } from "@/server/integrations/payments";
import {
  activateUserPlan,
  notify,
  recordProcessedTxn,
  writeAuditLog,
} from "@/server/store";
import { logger } from "@/server/lib/logger";
import { withApiErrorTracking } from "@/server/lib/api-error";

export const runtime = "nodejs";

/**
 * GET /api/billing/callback?orderId=bill_<plan>_<userId>_<ts>
 *
 * PhonePe (and the mock channel) bounce the user here after checkout. We:
 *   1. Verify the payment by polling provider status.
 *   2. Idempotently mark the txn processed (callback + S2S webhook race here).
 *   3. Activate the plan + notify + audit ONCE per txn.
 *   4. Redirect to /upgrade/success (or /upgrade/failed).
 */
async function handler(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.redirect(new URL("/upgrade?error=missing_order", req.url));
  }

  // Decode plan + user from order id format `bill_<plan>_<userId>_<ts>`.
  const match = /^bill_(pro|premium)_([^_]+)_/.exec(orderId);
  if (!match) {
    return NextResponse.redirect(new URL("/upgrade?error=bad_order", req.url));
  }
  const plan = match[1] as "pro" | "premium";
  const userId = match[2];
  if (userId !== session.user.id) {
    logger.warn(
      { orderId, sessionUser: session.user.id },
      "billing.callback-mismatch",
    );
    return NextResponse.redirect(new URL("/upgrade?error=auth_mismatch", req.url));
  }

  const status = await getPaymentStatus(orderId);
  if (!status.ok || status.status !== "success") {
    logger.warn({ orderId, status }, "billing.callback-not-success");
    return NextResponse.redirect(
      new URL(`/upgrade?error=payment_${status.status}`, req.url),
    );
  }

  // Idempotency. providerTxnId is unique to this transaction. If the S2S
  // webhook already processed it, firstTime=false and we just redirect.
  const txnId =
    (status as { providerTxnId?: string }).providerTxnId ?? orderId;
  const record = await recordProcessedTxn({
    txnId,
    provider: status.channel === "mock" ? "mock" : "phonepe",
    orderId,
    userId,
    plan,
    amountPaise: 0,
    status: "success",
    via: "callback",
  });

  if (record.firstTime) {
    await activateUserPlan(userId, plan, txnId);
    await notify({
      userId,
      kind: "plan_activated",
      priority: "high",
      title: plan === "premium" ? "Premium unlocked 🎉" : "Pro activated",
      body:
        plan === "premium"
          ? "Unlimited applications + AI Coach + every bootcamp included. Lifetime."
          : "5 applications per month + AI Coach for 30 days.",
      link: "/dashboard",
    });
    await writeAuditLog({
      actorId: userId,
      actorRole: "student",
      action: `billing.${plan}.activated`,
      targetType: "user",
      targetId: userId,
      summary: `Activated ${plan} plan via ${txnId}`,
    });
  } else {
    logger.info(
      { txnId, userId, plan },
      "billing.callback-already-processed",
    );
  }

  return NextResponse.redirect(new URL(`/upgrade/success?plan=${plan}`, req.url));
}

export const GET = withApiErrorTracking(handler);
