// Razorpay adapter — Standard Web Checkout (order + signature verify).
//
// Required env for live mode:
//   RAZORPAY_KEY_ID       e.g. rzp_test_xxx (test) / rzp_live_xxx (prod)
//   RAZORPAY_KEY_SECRET   server-only — never sent to the browser
//
// We talk to the REST API directly (Basic auth + node:crypto) to match the
// existing PhonePe adapter's zero-SDK style — no extra prod dependency for
// what is two HTTP calls and one HMAC.
//
// Docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
import { createHmac, timingSafeEqual } from "node:crypto";

const RAZORPAY_API = "https://api.razorpay.com/v1";

/** Smallest order Razorpay accepts is ₹1 = 100 paise. */
export const MIN_AMOUNT_PAISE = 100;

export function razorpayMode(): "live" | "unconfigured" {
  return process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    ? "live"
    : "unconfigured";
}

export interface CreateOrderInput {
  /** Amount in paise (₹1 = 100). Must be >= MIN_AMOUNT_PAISE. */
  amountPaise: number;
  /** ISO-4217 currency. Razorpay test accounts default to INR. */
  currency?: string;
  /** Your internal reference (order/cart/user id). Max 40 chars. */
  receipt?: string;
  /** Arbitrary key/values echoed back on the payment. */
  notes?: Record<string, string>;
}

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      amount: number;
      currency: string;
    }
  | {
      ok: false;
      /** "auth" → bad keys (401); "api" → everything else (502/500). */
      kind: "auth" | "api";
      error: string;
    };

/**
 * Create a Razorpay order. The order id returned here is what the browser
 * hands to checkout.js and what we later HMAC against to verify payment.
 */
export async function createOrder(
  input: CreateOrderInput,
): Promise<CreateOrderResult> {
  if (razorpayMode() !== "live") {
    return { ok: false, kind: "api", error: "razorpay_unconfigured" };
  }
  if (
    !Number.isInteger(input.amountPaise) ||
    input.amountPaise < MIN_AMOUNT_PAISE
  ) {
    return { ok: false, kind: "api", error: "amount_below_minimum" };
  }

  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  try {
    const res = await fetch(`${RAZORPAY_API}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: input.amountPaise,
        currency: input.currency ?? "INR",
        receipt: input.receipt,
        notes: input.notes,
      }),
    });

    const data = (await res.json()) as {
      id?: string;
      amount?: number;
      currency?: string;
      error?: { description?: string };
    };

    if (res.status === 401) {
      return { ok: false, kind: "auth", error: "razorpay_auth_failed" };
    }
    if (!res.ok || !data.id) {
      return {
        ok: false,
        kind: "api",
        error: data.error?.description ?? "order_create_failed",
      };
    }
    return {
      ok: true,
      orderId: data.id,
      amount: data.amount ?? input.amountPaise,
      currency: data.currency ?? input.currency ?? "INR",
    };
  } catch (e) {
    return {
      ok: false,
      kind: "api",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}

/**
 * Verify the checkout signature: HMAC-SHA256(order_id + "|" + payment_id)
 * keyed with RAZORPAY_KEY_SECRET, compared in constant time against the
 * `razorpay_signature` the browser received on success.
 *
 * Returns true only on an exact match. Never trust a payment without this.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return false;

  const expected = createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  return safeHexEqual(expected, params.signature);
}

/**
 * Verify a Razorpay **webhook** signature: HMAC-SHA256 of the *raw* request
 * body keyed with `RAZORPAY_WEBHOOK_SECRET` (set in the Razorpay dashboard
 * when you create the webhook — distinct from the API key secret), compared
 * in constant time against the `X-Razorpay-Signature` header.
 *
 * Pass the exact raw body string (do not re-stringify parsed JSON — key order
 * and whitespace would differ and the HMAC would never match).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeHexEqual(expected, signature);
}

/** Constant-time hex-string compare. Length mismatch ⇒ not equal. */
function safeHexEqual(expectedHex: string, candidate: string): boolean {
  const a = Buffer.from(expectedHex, "utf8");
  const b = Buffer.from(candidate, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  status: string; // "captured" | "authorized" | "failed" | ...
  amount: number; // paise
  currency: string;
  notes?: Record<string, string>;
}

/**
 * Fetch a payment from Razorpay to confirm its server-side state (status,
 * amount, order) before granting access. The browser-reported success is
 * never trusted on its own — we re-read the payment from the source.
 */
export async function fetchPayment(
  paymentId: string,
): Promise<RazorpayPayment | null> {
  if (razorpayMode() !== "live") return null;
  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  try {
    // Belt-and-suspenders: even though the caller Zod-restricts paymentId to
    // `[A-Za-z0-9_-]`, encode it before interpolating so any future caller
    // that skips the schema can't smuggle a path traversal (`../account`)
    // into our authenticated Razorpay call.
    const safeId = encodeURIComponent(paymentId);
    const res = await fetch(`${RAZORPAY_API}/payments/${safeId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as RazorpayPayment;
  } catch {
    return null;
  }
}

export interface RazorpayRefundInput {
  /** The Razorpay payment id that was originally captured (`pay_xxx`). */
  paymentId: string;
  /** Refund amount in paise. MUST be > 0 and <= captured amount. */
  amountPaise: number;
  /** Idempotency key. Razorpay dedupes refunds by Receipt server-side
   *  when used inside a 24h window — we still also gate via ProcessedTxn. */
  receipt?: string;
  /** Free-form notes echoed back on the refund entity (audit trail only). */
  notes?: Record<string, string>;
  /** "normal" (T+3 working days) or "optimum" (instant, fees apply). */
  speed?: "normal" | "optimum";
}

export type RazorpayRefundResult =
  | {
      ok: true;
      refundId: string;
      status: string;
      amount: number;
    }
  | {
      ok: false;
      /** "auth" → bad keys (401); "api" → 4xx/5xx; "config" → adapter not live. */
      kind: "auth" | "api" | "config";
      error: string;
    };

/**
 * Issue a refund against a captured Razorpay payment.
 *
 * Idempotency: Razorpay's `Idempotency-Key` header is the source of truth — we
 * derive it from `receipt` (recommended: `refund_<original-payment>_<ts>`) so
 * the SAME caller retrying with the SAME receipt collapses to one refund
 * server-side, even if the network call timed out mid-flight on the first try.
 * We additionally gate at the application layer with `recordProcessedTxn`.
 *
 * Docs: https://razorpay.com/docs/api/refunds/create-normal/
 */
export async function refundPayment(
  input: RazorpayRefundInput,
): Promise<RazorpayRefundResult> {
  if (razorpayMode() !== "live") {
    return { ok: false, kind: "config", error: "razorpay_unconfigured" };
  }
  if (!Number.isInteger(input.amountPaise) || input.amountPaise <= 0) {
    return { ok: false, kind: "api", error: "amount_invalid" };
  }

  const keyId = process.env.RAZORPAY_KEY_ID!;
  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const idempotencyKey = input.receipt ?? `rfnd_${input.paymentId}`;

  try {
    const res = await fetch(
      `${RAZORPAY_API}/payments/${encodeURIComponent(input.paymentId)}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
          // Razorpay collapses duplicate refunds with the same key for 24h.
          "X-Razorpay-Idempotency": idempotencyKey,
        },
        body: JSON.stringify({
          amount: input.amountPaise,
          speed: input.speed ?? "normal",
          notes: input.notes,
          receipt: input.receipt,
        }),
      },
    );

    const data = (await res.json()) as {
      id?: string;
      status?: string;
      amount?: number;
      error?: { description?: string; code?: string };
    };

    if (res.status === 401) {
      return { ok: false, kind: "auth", error: "razorpay_auth_failed" };
    }
    if (!res.ok || !data.id) {
      return {
        ok: false,
        kind: "api",
        error:
          data.error?.description ??
          data.error?.code ??
          `refund_failed_http_${res.status}`,
      };
    }
    return {
      ok: true,
      refundId: data.id,
      status: data.status ?? "unknown",
      amount: data.amount ?? input.amountPaise,
    };
  } catch (e) {
    return {
      ok: false,
      kind: "api",
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}
