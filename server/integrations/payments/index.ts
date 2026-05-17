// Payments adapter — PhonePe in prod, mock in dev.
// Required env for live mode:
//   PHONEPE_MERCHANT_ID
//   PHONEPE_SALT_KEY
//   PHONEPE_SALT_INDEX (usually "1")
//   PHONEPE_BASE_URL    e.g. https://api.phonepe.com/apis/hermes  (prod)
//                        or  https://api-preprod.phonepe.com/apis/pg-sandbox
//
// Phase 1 mock pretends every payment succeeds after a 600ms delay.
import { createHash } from "node:crypto";

export interface CreatePaymentInput {
  /** Internal order id — what we get back in the callback. */
  orderId: string;
  /** Amount in paise (₹1 = 100). */
  amountPaise: number;
  /** Used for receipt display. */
  description: string;
  /** Where PhonePe redirects after payment. */
  redirectUrl: string;
  /** Phone for OTP-pull within PhonePe sheet. Optional. */
  payerPhone?: string;
}

export interface CreatePaymentResult {
  ok: boolean;
  channel: "phonepe" | "mock";
  /** URL to redirect the browser to. */
  redirectUrl?: string;
  /** Provider-side txn id. */
  providerTxnId?: string;
  error?: string;
}

export interface PaymentStatusResult {
  ok: boolean;
  channel: "phonepe" | "mock";
  status: "pending" | "success" | "failed";
  error?: string;
}

export function paymentsMode(): "live" | "mock" {
  return process.env.PHONEPE_MERCHANT_ID && process.env.PHONEPE_SALT_KEY
    ? "live"
    : "mock";
}

/**
 * Guard against silently running mock payments in production. We call this
 * at the top of every state-changing payment helper so that an accidental
 * deploy without PHONEPE_* env keys fails loudly rather than gifting money
 * to whoever clicks "Pay".
 *
 * Override (e.g. for staging using mock channel intentionally) by setting
 * ALLOW_MOCK_PAYMENTS=true.
 */
function assertNotMockInProd(action: string): void {
  if (
    paymentsMode() === "mock" &&
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_MOCK_PAYMENTS !== "true"
  ) {
    throw new Error(
      `[payments] refusing to ${action} in mock mode — PHONEPE_* env keys missing in production. ` +
        `Set them, or explicitly opt in with ALLOW_MOCK_PAYMENTS=true (staging only).`,
    );
  }
}

const mockOrders = new Map<string, { amount: number; ts: number }>();

export async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  assertNotMockInProd("createPayment");
  if (paymentsMode() === "mock") {
    mockOrders.set(input.orderId, {
      amount: input.amountPaise,
      ts: Date.now(),
    });
    // In mock mode we drop a fake hosted-checkout URL that immediately
    // redirects to the success callback. UI shows a "Demo · auto-succeed" banner.
    const url = `${input.redirectUrl}?status=success&orderId=${input.orderId}&mock=1`;
    return {
      ok: true,
      channel: "mock",
      redirectUrl: url,
      providerTxnId: `mock_${input.orderId}`,
    };
  }
  try {
    const base = process.env.PHONEPE_BASE_URL!;
    const merchantId = process.env.PHONEPE_MERCHANT_ID!;
    const saltKey = process.env.PHONEPE_SALT_KEY!;
    const saltIndex = process.env.PHONEPE_SALT_INDEX ?? "1";

    const payload = {
      merchantId,
      merchantTransactionId: input.orderId,
      merchantUserId: input.payerPhone ?? "anon",
      amount: input.amountPaise,
      redirectUrl: input.redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: input.redirectUrl,
      mobileNumber: input.payerPhone,
      paymentInstrument: { type: "PAY_PAGE" },
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    const sig =
      createHash("sha256")
        .update(encoded + "/pg/v1/pay" + saltKey)
        .digest("hex") +
      "###" +
      saltIndex;

    const res = await fetch(`${base}/pg/v1/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": sig,
      },
      body: JSON.stringify({ request: encoded }),
    });
    const data = (await res.json()) as {
      success?: boolean;
      data?: { instrumentResponse?: { redirectInfo?: { url?: string } } };
      message?: string;
    };
    if (!data.success) {
      return {
        ok: false,
        channel: "phonepe",
        error: data.message ?? "create_failed",
      };
    }
    return {
      ok: true,
      channel: "phonepe",
      redirectUrl: data.data?.instrumentResponse?.redirectInfo?.url,
      providerTxnId: input.orderId,
    };
  } catch (e) {
    return {
      ok: false,
      channel: "phonepe",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

export async function getPaymentStatus(
  orderId: string,
): Promise<PaymentStatusResult> {
  assertNotMockInProd("getPaymentStatus");
  if (paymentsMode() === "mock") {
    const o = mockOrders.get(orderId);
    if (!o) return { ok: false, channel: "mock", status: "failed", error: "unknown_order" };
    return { ok: true, channel: "mock", status: "success" };
  }
  try {
    const base = process.env.PHONEPE_BASE_URL!;
    const merchantId = process.env.PHONEPE_MERCHANT_ID!;
    const saltKey = process.env.PHONEPE_SALT_KEY!;
    const saltIndex = process.env.PHONEPE_SALT_INDEX ?? "1";

    const path = `/pg/v1/status/${merchantId}/${orderId}`;
    const sig =
      createHash("sha256").update(path + saltKey).digest("hex") +
      "###" +
      saltIndex;
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": sig,
        "X-MERCHANT-ID": merchantId,
      },
    });
    const data = (await res.json()) as {
      code?: string;
      success?: boolean;
    };
    if (data.code === "PAYMENT_SUCCESS") {
      return { ok: true, channel: "phonepe", status: "success" };
    }
    if (data.code === "PAYMENT_PENDING") {
      return { ok: true, channel: "phonepe", status: "pending" };
    }
    return { ok: true, channel: "phonepe", status: "failed" };
  } catch (e) {
    return {
      ok: false,
      channel: "phonepe",
      status: "failed",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

export interface RefundInput {
  /** Original PhonePe transaction id we want to reverse. */
  originalTxnId: string;
  /** Idempotent merchant-side refund id — usually `refund_${original}_${ts}`. */
  refundOrderId: string;
  amountPaise: number;
  reason?: string;
}

export interface RefundResult {
  ok: boolean;
  channel: "phonepe" | "mock";
  refundTxnId?: string;
  error?: string;
}

/**
 * Issue a refund through PhonePe. In mock mode we just acknowledge — the
 * caller still does all the bookkeeping (ProcessedTxn row, audit log).
 */
export async function refundPayment(input: RefundInput): Promise<RefundResult> {
  assertNotMockInProd("refundPayment");
  if (paymentsMode() === "mock") {
    return {
      ok: true,
      channel: "mock",
      refundTxnId: `mock_refund_${input.refundOrderId}`,
    };
  }
  try {
    const base = process.env.PHONEPE_BASE_URL!;
    const merchantId = process.env.PHONEPE_MERCHANT_ID!;
    const saltKey = process.env.PHONEPE_SALT_KEY!;
    const saltIndex = process.env.PHONEPE_SALT_INDEX ?? "1";

    const payload = {
      merchantId,
      merchantUserId: "admin",
      originalTransactionId: input.originalTxnId,
      merchantTransactionId: input.refundOrderId,
      amount: input.amountPaise,
      callbackUrl:
        (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000") +
        "/api/payments/phonepe/webhook",
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    const sig =
      createHash("sha256")
        .update(encoded + "/pg/v1/refund" + saltKey)
        .digest("hex") +
      "###" +
      saltIndex;

    const res = await fetch(`${base}/pg/v1/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": sig,
      },
      body: JSON.stringify({ request: encoded }),
    });
    const data = (await res.json()) as {
      success?: boolean;
      message?: string;
      data?: { merchantTransactionId?: string };
    };
    if (!data.success) {
      return {
        ok: false,
        channel: "phonepe",
        error: data.message ?? "refund_failed",
      };
    }
    return {
      ok: true,
      channel: "phonepe",
      refundTxnId: data.data?.merchantTransactionId,
    };
  } catch (e) {
    return {
      ok: false,
      channel: "phonepe",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}
