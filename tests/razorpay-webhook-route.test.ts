/**
 * Razorpay webhook — the AUTHORITATIVE fulfilment path. If the browser closes
 * the tab the instant after paying (so /verify never fires), this still grants
 * the plan. It also receives refund/dispute events that reverse the matching
 * creator reward.
 *
 * Security gates exercised here (defense in depth):
 *   - HMAC over the raw body keyed with RAZORPAY_WEBHOOK_SECRET — invalid =>
 *     400, nothing happens. The webhook secret is DISTINCT from the API key
 *     secret used for the payment signature.
 *   - Webhook handler trusts NO field of the payload until the HMAC matches.
 *   - Underpayment is refused at this layer too (re-derives server price).
 *   - `payment.captured` and `payment.authorized` both fulfil; everything else
 *     ACKs with 200 so Razorpay stops retrying ignored events.
 *   - `refund.processed` and `payment.dispute.*` reverse the original reward.
 *   - Replay safety — the same event arriving twice never double-grants and
 *     never double-debits the creator's ledger.
 */
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { createHmac } from "node:crypto";

import { POST } from "@/app/api/payments/razorpay/webhook/route";
import { UserModel, ProcessedTxnModel } from "@/server/db/models";
import {
  CreatorProfileModel,
  CommissionAgreementModel,
  CreatorRewardModel,
  CreditLedgerModel,
} from "@/server/db/creator-models";
import { createCreator } from "@/server/creator/creator.service";
import { getRewardByPaymentId } from "@/server/creator/reward.service";
import { getBalance } from "@/server/creator/ledger.service";
import { coursesPricing } from "@/server/payments/courses";
import { jobsPlanPricing } from "@/server/payments/subscription";

const WEBHOOK_SECRET = "wh_test_secret";

beforeAll(async () => {
  await Promise.all([
    CreatorProfileModel.createIndexes(),
    CommissionAgreementModel.createIndexes(),
    CreatorRewardModel.createIndexes(),
    CreditLedgerModel.createIndexes(),
  ]);
});

beforeEach(() => {
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.RAZORPAY_KEY_ID = "rzp_test_x";
  process.env.RAZORPAY_KEY_SECRET = "secret_x";
});

function signed(raw: string): Request {
  const sig = createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");
  return new Request("http://test.local/api/payments/razorpay/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-razorpay-signature": sig,
    },
    body: raw,
  });
}

async function makeStudent(id: string, attributedTo?: string): Promise<void> {
  await UserModel.create({
    _id: id,
    email: `${id}@x.test`,
    role: "student",
    name: "Buyer",
    plan: "free",
    referredByCreatorId: attributedTo,
    createdAt: new Date().toISOString(),
  });
}

async function newCreator(commission = 15): Promise<string> {
  const res = await createCreator(
    {
      name: "Creator",
      email: `c_${Math.random().toString(36).slice(2, 9)}@x.test`,
      password: "TestPass1",
      commission: { type: "percentage", value: commission },
    },
    "u_admin",
  );
  if (!res.ok) throw new Error("createCreator failed");
  return res.profile.creatorId;
}

describe("POST /api/payments/razorpay/webhook — signature gate", () => {
  it("400s when X-Razorpay-Signature is missing", async () => {
    const raw = JSON.stringify({ event: "payment.captured", payload: {} });
    const req = new Request("http://test.local/api/payments/razorpay/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw,
    });
    const res = await POST(req, undefined);
    expect(res.status).toBe(400);
  });

  it("400s when the signature doesn't match the raw body", async () => {
    const raw = JSON.stringify({ event: "payment.captured", payload: {} });
    const req = new Request("http://test.local/api/payments/razorpay/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": "deadbeef".repeat(8),
      },
      body: raw,
    });
    const res = await POST(req, undefined);
    expect(res.status).toBe(400);
  });

  it("400s when secret is set but JSON body is unparseable (after HMAC accepts)", async () => {
    const raw = "not-json{";
    const res = await POST(signed(raw), undefined);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/payments/razorpay/webhook — fulfilment", () => {
  it("ignores an unrelated event with 200 (so Razorpay stops retrying)", async () => {
    const raw = JSON.stringify({
      event: "order.paid",
      payload: { payment: { entity: { id: "pay_z", order_id: "o_z" } } },
    });
    const res = await POST(signed(raw), undefined);
    expect(res.status).toBe(200);
    expect((await res.json()).ignored).toBe("order.paid");
  });

  it("payment.captured grants the course bundle + creates the creator reward", async () => {
    const creatorId = await newCreator(10); // 10%
    await makeStudent("u_w_ai", creatorId);
    const expected = coursesPricing(["ai"]);

    const raw = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_w_ai",
            order_id: "ord_w_ai",
            amount: expected.totalInPaise,
            status: "captured",
            notes: { userId: "u_w_ai", kind: "courses", courses: "ai" },
          },
        },
      },
    });
    const res = await POST(signed(raw), undefined);
    expect(res.status).toBe(200);

    const user = await UserModel.findById("u_w_ai").lean();
    expect((user?.ownedCourses ?? []).map((g) => g.course).sort()).toEqual(
      ["ai", "entrepreneurship", "marketing", "sales"].sort(),
    );
    // Reward base = pre-GST cart price (₹4,999), 10% = ₹499.90 = 49_990 paise.
    const reward = await getRewardByPaymentId("pay_w_ai");
    expect(reward?.calculatedAmount).toBe(49_990);
    expect(await getBalance(creatorId)).toBe(49_990);
  });

  it("payment.authorized also fulfils (Razorpay can deliver it before .captured)", async () => {
    await makeStudent("u_auth_evt");
    const expected = jobsPlanPricing("jobs_quarterly").totalInPaise;
    const raw = JSON.stringify({
      event: "payment.authorized",
      payload: {
        payment: {
          entity: {
            id: "pay_auth_evt",
            order_id: "ord_auth_evt",
            amount: expected,
            status: "authorized",
            notes: { userId: "u_auth_evt", kind: "jobs", plan: "jobs_quarterly" },
          },
        },
      },
    });
    const res = await POST(signed(raw), undefined);
    expect(res.status).toBe(200);
    const user = await UserModel.findById("u_auth_evt").lean();
    expect(user?.plan).toBe("jobs_quarterly");
  });

  it("refuses an underpaid capture (amount_mismatch) and doesn't grant", async () => {
    await makeStudent("u_low");
    const raw = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_low",
            order_id: "ord_low",
            amount: 1, // pay ₹0.01 for jobs_annual
            status: "captured",
            notes: { userId: "u_low", kind: "jobs", plan: "jobs_annual" },
          },
        },
      },
    });
    const res = await POST(signed(raw), undefined);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { refused?: string };
    expect(body.refused).toBe("amount_mismatch");
    const user = await UserModel.findById("u_low").lean();
    expect(user?.plan).toBe("free");
    expect(await ProcessedTxnModel.countDocuments({ _id: "pay_low" })).toBe(0);
  });

  it("skips when notes.userId is absent (defensive — orphan payments never grant)", async () => {
    const raw = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_no_user",
            order_id: "ord_no_user",
            amount: jobsPlanPricing("jobs_quarterly").totalInPaise,
            status: "captured",
            notes: { kind: "jobs", plan: "jobs_quarterly" },
          },
        },
      },
    });
    const res = await POST(signed(raw), undefined);
    expect(res.status).toBe(200);
    expect((await res.json()).skipped).toBe("no_user_note");
  });

  it("the same captured-event redelivered never double-grants and never re-rewards", async () => {
    const creatorId = await newCreator(20);
    await makeStudent("u_dupe", creatorId);
    const expected = coursesPricing(["ai"]).totalInPaise;
    const raw = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_dupe_evt",
            order_id: "ord_dupe_evt",
            amount: expected,
            status: "captured",
            notes: { userId: "u_dupe", kind: "courses", courses: "ai" },
          },
        },
      },
    });

    const first = await POST(signed(raw), undefined);
    expect(first.status).toBe(200);
    const second = await POST(signed(raw), undefined);
    expect(second.status).toBe(200);

    expect(await ProcessedTxnModel.countDocuments({ _id: "pay_dupe_evt" })).toBe(1);
    expect(await CreatorRewardModel.countDocuments({ paymentId: "pay_dupe_evt" })).toBe(1);
    // 20% of ₹4,999 = ₹999.80 = 99_980 paise. Credited exactly once.
    expect(await getBalance(creatorId)).toBe(99_980);
  });
});

describe("POST /api/payments/razorpay/webhook — reversal events", () => {
  it("refund.processed reverses an existing reward (debits the creator)", async () => {
    const creatorId = await newCreator(15);
    await makeStudent("u_refund", creatorId);
    // Seed a successful capture so the reward exists.
    const expected = coursesPricing(["ai"]).totalInPaise;
    await POST(signed(JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_refund_src",
            order_id: "ord_refund_src",
            amount: expected,
            status: "captured",
            notes: { userId: "u_refund", kind: "courses", courses: "ai" },
          },
        },
      },
    }),), undefined);
    expect(await getBalance(creatorId)).toBe(74_985); // 15% of ₹4,999

    // Now refund.processed → reverse the reward.
    const refundRaw = JSON.stringify({
      event: "refund.processed",
      payload: { refund: { entity: { payment_id: "pay_refund_src" } } },
    });
    const res = await POST(signed(refundRaw), undefined);
    expect(res.status).toBe(200);
    expect(await getBalance(creatorId)).toBe(0);
    const reward = await getRewardByPaymentId("pay_refund_src");
    expect(reward?.status).toBe("reversed");
  });

  it("payment.dispute.lost reverses the reward (chargeback)", async () => {
    const creatorId = await newCreator(15);
    await makeStudent("u_cb", creatorId);
    const expected = coursesPricing(["ai"]).totalInPaise;
    await POST(signed(JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_cb_src",
            order_id: "ord_cb_src",
            amount: expected,
            status: "captured",
            notes: { userId: "u_cb", kind: "courses", courses: "ai" },
          },
        },
      },
    }),), undefined);
    expect(await getBalance(creatorId)).toBe(74_985);

    const cbRaw = JSON.stringify({
      event: "payment.dispute.lost",
      payload: { payment: { entity: { id: "pay_cb_src" } } },
    });
    const res = await POST(signed(cbRaw), undefined);
    expect(res.status).toBe(200);
    expect(await getBalance(creatorId)).toBe(0);
  });

  it("a reversal event with NO parseable payment_id ACKs reversed:false (Bug 4 — never lies about reversing)", async () => {
    const raw = JSON.stringify({
      event: "refund.processed",
      // Garbage payload — neither payload.refund.entity nor payload.payment.entity.
      payload: { unexpected_shape: { foo: "bar" } },
    });
    const res = await POST(signed(raw), undefined);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      reversed: boolean;
      reason?: string;
      event?: string;
    };
    expect(body.reversed).toBe(false);
    expect(body.reason).toBe("no_payment_id");
    expect(body.event).toBe("refund.processed");
  });

  it("a real refund.processed event ACKs reversed:true and propagates the actual outcome", async () => {
    const creatorId = await newCreator(15);
    await makeStudent("u_truthful", creatorId);
    const expected = coursesPricing(["ai"]).totalInPaise;
    await POST(
      signed(
        JSON.stringify({
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: "pay_truthful",
                order_id: "ord_truthful",
                amount: expected,
                status: "captured",
                notes: { userId: "u_truthful", kind: "courses", courses: "ai" },
              },
            },
          },
        }),
      ),
      undefined,
    );

    const res = await POST(
      signed(
        JSON.stringify({
          event: "refund.processed",
          payload: { refund: { entity: { payment_id: "pay_truthful" } } },
        }),
      ),
      undefined,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { reversed: boolean; event: string };
    expect(body.reversed).toBe(true);
    expect(body.event).toBe("refund.processed");

    // Replay of the SAME refund event → already terminal → reversed:false truthfully.
    const replay = await POST(
      signed(
        JSON.stringify({
          event: "refund.processed",
          payload: { refund: { entity: { payment_id: "pay_truthful" } } },
        }),
      ),
      undefined,
    );
    expect(replay.status).toBe(200);
    expect(((await replay.json()) as { reversed: boolean }).reversed).toBe(false);
  });
});
