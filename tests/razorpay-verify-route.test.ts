/**
 * Razorpay /verify route — the browser callback that grants the plan IMMEDIATELY
 * after a successful checkout. Every defense in here is load-bearing because
 * this path runs BEFORE the (delayed, asynchronous) webhook does:
 *
 *   1. HMAC signature must match (constant-time) — else nothing is granted.
 *   2. Re-read the payment from Razorpay (status must be captured/authorized,
 *      order id must match) — never trust the browser-reported success.
 *   3. Buyer in payment.notes MUST be the session user — blocks a cross-user
 *      replay attack ("I'll send your /verify with my login").
 *   4. amount MUST be >= server-priced amount — blocks an underpaid checkout
 *      that somehow got through the order-side gate (defense in depth).
 *   5. Fulfilment is shared with the webhook and is idempotent.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";

import { POST } from "@/app/api/payments/razorpay/verify/route";
import { UserModel, ProcessedTxnModel } from "@/server/db/models";
import { __addAllowedHost } from "@/server/lib/csrf";
import { jobsPlanPricing } from "@/server/payments/subscription";
import { coursesPricing } from "@/server/payments/courses";

__addAllowedHost("test.local");

const KEY_SECRET = "verify_test_secret";
const KEY_ID = "rzp_test_verify";

interface FetchResponse {
  status: number;
  body: Record<string, unknown>;
}

const realFetch = global.fetch;
let nextResponse: FetchResponse = { status: 200, body: {} };

beforeEach(async () => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = KEY_ID;

  global.fetch = (async () => {
    return new Response(JSON.stringify(nextResponse.body), {
      status: nextResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
});

afterEach(() => {
  global.fetch = realFetch;
});

function asUser(user: { id: string; role: string } | null): void {
  vi.mocked(getServerSession).mockResolvedValue(user ? { user } : null);
}

function signature(orderId: string, paymentId: string): string {
  return createHmac("sha256", KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

function post(body: unknown): Request {
  return new Request("http://test.local/api/payments/razorpay/verify", {
    method: "POST",
    headers: {
      origin: "http://test.local",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function makeStudent(id: string): Promise<void> {
  await UserModel.create({
    _id: id,
    email: `${id}@x.test`,
    role: "student",
    name: "Buyer",
    plan: "free",
    createdAt: new Date().toISOString(),
  });
}

describe("POST /api/payments/razorpay/verify — auth + CSRF", () => {
  it("401s an unauthenticated caller", async () => {
    asUser(null);
    const res = await POST(post({
      razorpay_order_id: "order_x",
      razorpay_payment_id: "pay_x",
      razorpay_signature: "sig",
    }), undefined);
    expect(res.status).toBe(401);
  });

  it("403s a CSRF-bad origin", async () => {
    asUser({ id: "u", role: "student" });
    const req = new Request("http://test.local/api/payments/razorpay/verify", {
      method: "POST",
      headers: { origin: "http://attacker.example", "content-type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: "order_x",
        razorpay_payment_id: "pay_x",
        razorpay_signature: "sig",
      }),
    });
    const res = await POST(req, undefined);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/payments/razorpay/verify — security guards", () => {
  it("400s a tampered signature (never reaches Razorpay)", async () => {
    await makeStudent("u_sig");
    asUser({ id: "u_sig", role: "student" });
    const res = await POST(post({
      razorpay_order_id: "order_sig",
      razorpay_payment_id: "pay_sig",
      razorpay_signature: "0".repeat(64), // wrong length-equivalent dummy
    }), undefined);
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("signature_mismatch");
  });

  it("400s when Razorpay re-read returns a non-captured status", async () => {
    await makeStudent("u_unc");
    asUser({ id: "u_unc", role: "student" });
    const orderId = "order_unc";
    const paymentId = "pay_unc";
    nextResponse = {
      status: 200,
      body: {
        id: paymentId,
        order_id: orderId,
        status: "failed",
        amount: jobsPlanPricing("jobs_quarterly").totalInPaise,
        currency: "INR",
        notes: { userId: "u_unc", kind: "jobs", plan: "jobs_quarterly" },
      },
    };
    const res = await POST(post({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature(orderId, paymentId),
    }), undefined);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("payment_not_confirmed");
  });

  it("403s a buyer-mismatch replay (session user ≠ payment.notes.userId)", async () => {
    await makeStudent("u_session");
    asUser({ id: "u_session", role: "student" });
    const orderId = "order_xuser";
    const paymentId = "pay_xuser";
    nextResponse = {
      status: 200,
      body: {
        id: paymentId,
        order_id: orderId,
        status: "captured",
        amount: jobsPlanPricing("jobs_annual").totalInPaise,
        currency: "INR",
        notes: { userId: "u_attacker", kind: "jobs", plan: "jobs_annual" },
      },
    };
    const res = await POST(post({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature(orderId, paymentId),
    }), undefined);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("buyer_mismatch");
  });

  it("400s an underpaid jobs purchase", async () => {
    await makeStudent("u_under");
    asUser({ id: "u_under", role: "student" });
    const orderId = "order_under";
    const paymentId = "pay_under";
    const expected = jobsPlanPricing("jobs_annual").totalInPaise;
    nextResponse = {
      status: 200,
      body: {
        id: paymentId,
        order_id: orderId,
        status: "captured",
        amount: expected - 100, // ₹1 short
        currency: "INR",
        notes: { userId: "u_under", kind: "jobs", plan: "jobs_annual" },
      },
    };
    const res = await POST(post({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature(orderId, paymentId),
    }), undefined);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("amount_mismatch");
  });

  it("400s an underpaid course purchase", async () => {
    await makeStudent("u_cu");
    asUser({ id: "u_cu", role: "student" });
    const orderId = "order_cu";
    const paymentId = "pay_cu";
    const expected = coursesPricing(["ai"]).totalInPaise;
    nextResponse = {
      status: 200,
      body: {
        id: paymentId,
        order_id: orderId,
        status: "captured",
        amount: expected - 1,
        currency: "INR",
        notes: { userId: "u_cu", kind: "courses", courses: "ai" },
      },
    };
    const res = await POST(post({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature(orderId, paymentId),
    }), undefined);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("amount_mismatch");
  });
});

describe("POST /api/payments/razorpay/verify — happy path + idempotency", () => {
  it("grants a jobs plan + records exactly one processed txn", async () => {
    await makeStudent("u_ok");
    asUser({ id: "u_ok", role: "student" });
    const orderId = "order_ok";
    const paymentId = "pay_ok";
    const expected = jobsPlanPricing("jobs_quarterly").totalInPaise;
    nextResponse = {
      status: 200,
      body: {
        id: paymentId,
        order_id: orderId,
        status: "captured",
        amount: expected,
        currency: "INR",
        notes: { userId: "u_ok", kind: "jobs", plan: "jobs_quarterly" },
      },
    };
    const res = await POST(post({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature(orderId, paymentId),
    }), undefined);
    expect(res.status).toBe(200);
    expect((await res.json()).verified).toBe(true);

    const user = await UserModel.findById("u_ok").lean();
    expect(user?.plan).toBe("jobs_quarterly");
    expect(await ProcessedTxnModel.countDocuments({ _id: paymentId })).toBe(1);
  });

  it("replay of the same verify call doesn't double-fulfil", async () => {
    await makeStudent("u_rep");
    asUser({ id: "u_rep", role: "student" });
    const orderId = "order_rep";
    const paymentId = "pay_rep";
    const expected = jobsPlanPricing("jobs_annual").totalInPaise;
    nextResponse = {
      status: 200,
      body: {
        id: paymentId,
        order_id: orderId,
        status: "captured",
        amount: expected,
        currency: "INR",
        notes: { userId: "u_rep", kind: "jobs", plan: "jobs_annual" },
      },
    };
    const sig = signature(orderId, paymentId);

    const first = await POST(post({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
    }), undefined);
    expect(first.status).toBe(200);

    const second = await POST(post({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: sig,
    }), undefined);
    expect(second.status).toBe(200);
    expect((await second.json()).verified).toBe(true);

    expect(await ProcessedTxnModel.countDocuments({ _id: paymentId })).toBe(1);
  });
});
