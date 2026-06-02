import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { paymentsMode, getPaymentStatus } from "@/server/integrations/payments";
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
 * POST /api/payments/phonepe/webhook
 *
 * Server-to-server callback from PhonePe. Verifies the `X-VERIFY` HMAC
 * against the raw body + the salt key, parses the base64 payload, then
 * idempotently activates the plan. This protects against:
 *   - replay (recordProcessedTxn unique on providerTxnId)
 *   - forgery (X-VERIFY mismatch → 401)
 *   - race with /api/billing/callback (idempotency record wins once)
 *
 * In mock mode we skip the signature check (no salt to verify against).
 * In production assertNotMockInProd() inside getPaymentStatus would also
 * have thrown if PHONEPE_* env keys were missing.
 */
async function handler(req: Request) {
  // We need the raw body for the HMAC, so don't pre-parse JSON.
  const raw = await req.text();
  const headerSig = req.headers.get("x-verify") ?? "";

  if (paymentsMode() === "live") {
    const saltKey = process.env.PHONEPE_SALT_KEY ?? "";
    const saltIndex = process.env.PHONEPE_SALT_INDEX ?? "1";
    const expected =
      createHash("sha256").update(raw + saltKey).digest("hex") +
      "###" +
      saltIndex;
    if (headerSig !== expected) {
      logger.warn(
        { gotPrefix: headerSig.slice(0, 8) },
        "phonepe.webhook-sig-mismatch",
      );
      return NextResponse.json({ error: "bad_signature" }, { status: 401 });
    }
  }

  let payload: {
    response?: string;
    merchantTransactionId?: string;
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  // PhonePe base64-encodes the actual response data. Decode it.
  let decoded: {
    success?: boolean;
    code?: string;
    data?: {
      merchantTransactionId?: string;
      transactionId?: string;
      amount?: number;
      state?: string;
    };
  } = {};
  if (payload.response) {
    try {
      decoded = JSON.parse(
        Buffer.from(payload.response, "base64").toString("utf8"),
      );
    } catch {
      return NextResponse.json({ error: "bad_inner_payload" }, { status: 400 });
    }
  }

  const orderId =
    decoded.data?.merchantTransactionId ??
    payload.merchantTransactionId ??
    "";
  if (!orderId) {
    return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
  }

  // Decode plan + userId from our orderId convention.
  const match = /^bill_(premium)_(.+)_(\d+)$/.exec(orderId);
  if (!match) {
    // Not a billing order — could be a legacy bootcamp order, sponsorship,
    // or an attacker. Log and ack 200 (returning non-200 makes PhonePe retry).
    logger.warn({ orderId }, "phonepe.webhook-non-billing-order");
    return NextResponse.json({ ok: true, ignored: true });
  }
  const plan = match[1] as "premium";
  const userId = match[2];
  const state = decoded.data?.state ?? "FAILED";

  if (state !== "COMPLETED" && !decoded.success) {
    await recordProcessedTxn({
      txnId: decoded.data?.transactionId ?? orderId,
      provider: "phonepe",
      orderId,
      userId,
      plan,
      amountPaise: decoded.data?.amount ?? 0,
      status: "failed",
      via: "webhook",
    });
    return NextResponse.json({ ok: true, status: "failed" });
  }

  // Sanity re-check with the status API. Belt-and-suspenders against a forged
  // payload that somehow passed the signature.
  const status = await getPaymentStatus(orderId);
  if (!status.ok || status.status !== "success") {
    return NextResponse.json({ ok: true, status: "status-mismatch" });
  }

  const txnId = decoded.data?.transactionId ?? orderId;
  const record = await recordProcessedTxn({
    txnId,
    provider: "phonepe",
    orderId,
    userId,
    plan,
    amountPaise: decoded.data?.amount ?? 0,
    status: "success",
    via: "webhook",
  });

  if (record.firstTime) {
    await activateUserPlan(userId, plan, txnId);
    await notify({
      userId,
      kind: "plan_activated",
      priority: "high",
      title: "Premium unlocked 🎉",
      body: "Unlimited applications + every bootcamp included. Lifetime.",
      link: "/dashboard",
    });
    await writeAuditLog({
      actorId: userId,
      actorRole: "student",
      action: `billing.${plan}.activated`,
      targetType: "user",
      targetId: userId,
      summary: `Activated ${plan} plan via webhook ${txnId}`,
    });
  }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorTracking(handler);
