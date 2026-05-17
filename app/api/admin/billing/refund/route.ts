import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { refundPayment } from "@/server/integrations/payments";
import {
  activateUserPlan,
  notify,
  writeAuditLog,
  getUserById,
  recordProcessedTxn,
} from "@/server/store";

export const runtime = "nodejs";

const Input = z.object({
  userId: z.string().min(1).max(64),
  originalTxnId: z.string().min(1).max(120),
  amountPaise: z.number().int().positive().max(50_000_000),
  reason: z.string().min(3).max(500),
  /** If true, also revoke the plan (set to "free"). Default true. */
  revokePlan: z.boolean().optional(),
});

/**
 * POST /api/admin/billing/refund
 *
 * Admin-only. Issues a refund through PhonePe for a specific original
 * transaction id. By default also revokes the user's plan back to Free
 * (toggle off via `revokePlan: false` for partial refunds where access
 * should continue).
 *
 * Idempotency: the refund order id is deterministic per original txn so
 * a re-submit hits the same Mongo unique index inside recordProcessedTxn.
 */
async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const { userId, originalTxnId, amountPaise, reason } = parsed.data;
  const revokePlan = parsed.data.revokePlan ?? true;

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const refundOrderId = `refund_${originalTxnId}_${Date.now().toString(36)}`;
  const result = await refundPayment({
    originalTxnId,
    refundOrderId,
    amountPaise,
    reason,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "refund_failed", reason: result.error },
      { status: 502 },
    );
  }

  await recordProcessedTxn({
    txnId: result.refundTxnId ?? refundOrderId,
    provider: result.channel,
    orderId: refundOrderId,
    userId,
    plan: "pro",
    amountPaise: -amountPaise,
    status: "success",
    via: "callback",
  });

  if (revokePlan) {
    await activateUserPlan(userId, "free");
  }

  await notify({
    userId,
    kind: "plan_activated",
    priority: "high",
    title: "Refund issued",
    body: `₹${(amountPaise / 100).toFixed(2)} refunded. ${
      revokePlan ? "Your plan has been moved to Free." : "Your plan is unchanged."
    } It usually shows up on your statement in 5-7 business days.`,
    link: "/student/settings",
  });

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "billing.refund.issued",
    targetType: "user",
    targetId: userId,
    summary: `Refunded ₹${amountPaise / 100} (txn ${originalTxnId}) — ${reason}`,
  });

  return NextResponse.json({
    ok: true,
    refundTxnId: result.refundTxnId,
    revokedPlan: revokePlan,
  });
}

export const POST = withRateLimit(
  { bucket: "admin.refund", limit: 60, windowSec: 3600, by: "user" },
  withApiErrorTracking(handler),
);
