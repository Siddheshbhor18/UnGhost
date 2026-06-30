import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { refundPayment as refundPhonePe } from "@/server/integrations/payments";
import { refundPayment as refundRazorpay } from "@/server/integrations/payments/razorpay";
import {
  activateUserPlan,
  notify,
  writeAuditLog,
  getUserById,
  recordProcessedTxn,
  getProcessedTxnById,
  getProcessedTxnByOrderId,
} from "@/server/store";
import { reverseRewardByPayment } from "@/server/creator/reward.service";
import { logger } from "@/server/lib/logger";
export const runtime = "nodejs";

/**
 * Why this route still exists when the platform is "all sales final":
 *
 *   The /refund-policy page is firm — Premium and course purchases are
 *   non-refundable as a PRODUCT decision. But three operational scenarios
 *   still require money to move backward, and the policy explicitly carves
 *   them out as "billing corrections, not product refunds":
 *
 *     1. `duplicate_charge`     — the buyer paid twice for the same item
 *                                 (modal closed mid-flow, double-click race,
 *                                 etc). We refund the duplicate; the buyer
 *                                 keeps access. Default revokePlan = false.
 *     2. `unauthorized_charge`  — the buyer's card was used by someone else
 *                                 (account takeover, lost card). Refund AND
 *                                 revoke. Default revokePlan = true.
 *     3. `dispute_settlement`   — admin/legal settled a complaint, RBI
 *                                 directive, or chargeback follow-up. The
 *                                 admin chooses revokePlan explicitly.
 *
 * The webhook path (`refund.processed` / `payment.dispute.lost`) handles
 * money that moved back OUTSIDE this route (Razorpay-dashboard refund, bank
 * chargeback). It's the reward-reversal companion to this route, and it must
 * keep working regardless of refund policy — commission cannot stay paid on
 * money that left the platform's bank account.
 */
const CorrectionKind = z.enum([
  "duplicate_charge",
  "unauthorized_charge",
  "dispute_settlement",
]);
type CorrectionKindValue = z.infer<typeof CorrectionKind>;

const Input = z.object({
  userId: z.string().min(1).max(64),
  originalTxnId: z.string().min(1).max(120),
  amountPaise: z.number().int().positive().max(50_000_000),
  /** Forces the admin to categorize this exception. Flows into audit log + */
  /*  reward-reversal metadata so future audits can quantify each carve-out. */
  correctionKind: CorrectionKind,
  /** Free-form context — what happened, why this is one of the three carve-outs. */
  reason: z.string().min(10).max(500),
  /** Override the per-kind default (see route docstring). */
  revokePlan: z.boolean().optional(),
});

// (Route docstring lives next to the schema above — `CorrectionKind`.)
async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const { userId, originalTxnId, amountPaise, reason, correctionKind } =
    parsed.data;
  // Per-kind default for plan revocation. Duplicate charges should NOT cost
  // the buyer their access — they paid twice; we're correcting the duplicate.
  const defaultRevoke = correctionKind !== "duplicate_charge";
  const revokePlan = parsed.data.revokePlan ?? defaultRevoke;

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  // Dispatch by the provider that originally processed this payment. Without
  // a ProcessedTxn row we have no way to know which gateway to call — reject
  // rather than guess.
  const original = await getProcessedTxnById(originalTxnId);
  if (!original) {
    return NextResponse.json(
      { error: "original_txn_not_found" },
      { status: 404 },
    );
  }
  if (original.userId !== userId) {
    return NextResponse.json(
      { error: "txn_user_mismatch" },
      { status: 400 },
    );
  }
  if (amountPaise > original.amountPaise) {
    return NextResponse.json(
      { error: "amount_exceeds_original" },
      { status: 400 },
    );
  }
  // Deterministic — survives the 24h Razorpay idempotency-key window AND lets
  // our local pre-check below collapse retries even days later.
  const refundOrderId = `refund_${originalTxnId}`;

  // Idempotency gate #1 — sequential retries (admin clicks "Refund" twice
  // because the first request timed out). If a refund row already exists for
  // this exact original payment, short-circuit. Same amount → idempotent OK;
  // different amount → 409 (admin reconciles via dashboard, never double-debit).
  const existing = await getProcessedTxnByOrderId(refundOrderId);
  if (existing) {
    const existingAmount = Math.abs(existing.amountPaise);
    if (existingAmount !== amountPaise) {
      return NextResponse.json(
        {
          error: "refund_already_exists",
          existingRefundTxnId: existing.id,
          existingAmountPaise: existingAmount,
          requestedAmountPaise: amountPaise,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      refundTxnId: existing.id,
      provider: existing.provider,
      idempotent: true,
    });
  }

  let refundTxnId: string;
  let provider: "phonepe" | "razorpay" | "mock";

  if (original.provider === "razorpay") {
    const r = await refundRazorpay({
      paymentId: originalTxnId,
      amountPaise,
      // Idempotency gate #2 — Razorpay collapses duplicate refunds for the
      // same receipt within 24h, so even if the pre-check missed (concurrent
      // calls), the gateway returns the SAME refund id.
      receipt: refundOrderId,
      notes: { userId, adminId: session.user.id, reason: reason.slice(0, 200) },
    });
    if (!r.ok) {
      logger.warn(
        { kind: r.kind, error: r.error, originalTxnId },
        "admin.refund.razorpay-failed",
      );
      return NextResponse.json(
        { error: "refund_failed", reason: r.error },
        { status: 502 },
      );
    }
    refundTxnId = r.refundId;
    provider = "razorpay";
  } else {
    const r = await refundPhonePe({
      originalTxnId,
      refundOrderId,
      amountPaise,
      reason,
    });
    if (!r.ok) {
      return NextResponse.json(
        { error: "refund_failed", reason: r.error },
        { status: 502 },
      );
    }
    refundTxnId = r.refundTxnId ?? refundOrderId;
    provider = r.channel;
  }

  // Idempotency gate #3 — last-mile defense for the (impossible-by-construction)
  // case where two concurrent callers slip both prior gates. The unique index
  // on ProcessedTxn._id ensures only one row exists; the loser short-circuits
  // here so it doesn't re-revoke / re-notify / re-audit.
  const record = await recordProcessedTxn({
    txnId: refundTxnId,
    provider,
    orderId: refundOrderId,
    userId,
    plan: original.plan,
    amountPaise: -amountPaise,
    status: "success",
    via: "callback",
  });
  if (!record.firstTime) {
    return NextResponse.json({
      ok: true,
      refundTxnId,
      provider,
      idempotent: true,
    });
  }

  if (revokePlan) {
    await activateUserPlan(userId, "free");
  }

  // Reverse any creator reward tied to this payment (loophole §9.2). The reward
  // is keyed by the original payment id; no reward / already-terminal → no-op.
  // Best-effort: a reversal hiccup must not fail the (already-issued) refund.
  try {
    await reverseRewardByPayment({
      paymentId: originalTxnId,
      kind: "refund",
      reason,
      actor: { actorType: "admin", actorId: session.user.id },
    });
  } catch (err) {
    logger.warn(
      { err, originalTxnId },
      "creator.reward-reversal-failed",
    );
  }

  const correctionLabel: Record<CorrectionKindValue, string> = {
    duplicate_charge: "Duplicate charge — refunded",
    unauthorized_charge: "Unauthorized charge — refunded + access revoked",
    dispute_settlement: "Refund issued",
  };
  await notify({
    userId,
    kind: "plan_activated",
    priority: "high",
    title: correctionLabel[correctionKind],
    body: `₹${(amountPaise / 100).toFixed(2)} refunded. ${
      revokePlan
        ? "Your plan has been moved to Free."
        : "Your plan is unchanged."
    } It usually shows up on your statement in 5-7 business days.`,
    link: "/student/settings",
  });

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "billing.correction.issued",
    targetType: "user",
    targetId: userId,
    summary: `[${correctionKind}] Refunded ₹${amountPaise / 100} (txn ${originalTxnId}) — ${reason}`,
  });

  return NextResponse.json({
    ok: true,
    refundTxnId,
    provider,
    revokedPlan: revokePlan,
  });
}

// 10 corrections / hour / admin — this is an exceptional path; if you're
// hitting the cap, something upstream is wrong (find it, don't widen this).
export const POST = withRateLimit(
  { bucket: "admin.refund", limit: 10, windowSec: 3600, by: "user" },
  withApiErrorTracking(handler),
);
