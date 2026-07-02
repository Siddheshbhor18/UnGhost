/**
 * Verify-vs-webhook concurrency proof. In production both paths arrive for the
 * same payment: the browser POSTs `/verify` the instant the modal succeeds,
 * and Razorpay's server-to-server webhook fires a few seconds later (and may
 * RETRY for hours on a non-2xx). The contract — enforced by the unique index
 * on `ProcessedTxn._id` — is "fulfilled exactly once, rewarded exactly once".
 *
 * This test runs both code paths in parallel against the SAME payment id and
 * asserts the post-conditions, so a future regression to a non-atomic check
 * fails loudly here.
 */
import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
import { getServerSession } from "next-auth";

import { POST as verifyRoute } from "@/app/api/payments/razorpay/verify/route";
import { POST as webhookRoute } from "@/app/api/payments/razorpay/webhook/route";
import { UserModel, ProcessedTxnModel } from "@/server/db/models";
import {
  CreatorProfileModel,
  CommissionAgreementModel,
  CreatorRewardModel,
  CreditLedgerModel,
} from "@/server/db/creator-models";
import { createCreator } from "@/server/creator/creator.service";
import { coursesPricing } from "@/server/payments/courses";
import { __addAllowedHost } from "@/server/lib/csrf";
import { getBalance } from "@/server/creator/ledger.service";

__addAllowedHost("test.local");

const KEY_SECRET = "race_test_secret";
const WEBHOOK_SECRET = "race_test_wh_secret";

const realFetch = global.fetch;

beforeAll(async () => {
  await Promise.all([
    CreatorProfileModel.createIndexes(),
    CommissionAgreementModel.createIndexes(),
    CreatorRewardModel.createIndexes(),
    CreditLedgerModel.createIndexes(),
  ]);
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = "rzp_test_race";
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_test_race";
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

afterEach(() => {
  global.fetch = realFetch;
});


async function activeCreator(): Promise<string> {
  const r = await createCreator(
    {
      name: "Race",
      email: `race_${Math.random().toString(36).slice(2, 9)}@x.test`,
      password: "TestPass1",
      commission: { type: "percentage", value: 10 },
    },
    "u_admin",
  );
  if (!r.ok) throw new Error("createCreator failed");
  await CreatorProfileModel.updateOne(
    { _id: r.profile.creatorId },
    { $set: { status: "active" } },
  );
  return r.profile.creatorId;
}

describe("Razorpay fulfilment race (verify ∥ webhook)", () => {
  it("concurrent verify + webhook for the same payment ⇒ one grant, one reward, one credit", async () => {
    const creatorId = await activeCreator();
    const buyerId = "usr_race_buyer";
    await UserModel.create({
      _id: buyerId,
      email: "race@x.test",
      role: "student",
      name: "Race",
      plan: "free",
      referredByCreatorId: creatorId,
      createdAt: new Date().toISOString(),
    });

    const orderId = "order_race";
    const paymentId = "pay_race";
    const expected = coursesPricing(["ai"]).totalInPaise;
    const notes = { userId: buyerId, kind: "courses", courses: "ai" };

    // /verify re-reads the payment from Razorpay — stub global fetch.
    global.fetch = (async () => {
      return new Response(
        JSON.stringify({
          id: paymentId,
          order_id: orderId,
          status: "captured",
          amount: expected,
          currency: "INR",
          notes,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: buyerId, role: "student" } });

    // Build both requests.
    const verifyReq = new Request("http://test.local/api/payments/razorpay/verify", {
      method: "POST",
      headers: {
        origin: "http://test.local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: createHmac("sha256", KEY_SECRET)
          .update(`${orderId}|${paymentId}`)
          .digest("hex"),
      }),
    });
    const webhookRaw = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: expected,
            status: "captured",
            notes,
          },
        },
      },
    });
    const webhookReq = new Request(
      "http://test.local/api/payments/razorpay/webhook",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-razorpay-signature": createHmac("sha256", WEBHOOK_SECRET)
            .update(webhookRaw)
            .digest("hex"),
        },
        body: webhookRaw,
      },
    );

    // Fire both at once. Either may win the unique-index race; both MUST 2xx.
    const [verifyRes, webhookRes] = await Promise.all([
      verifyRoute(verifyReq, undefined),
      webhookRoute(webhookReq, undefined),
    ]);
    expect(verifyRes.status).toBe(200);
    expect(webhookRes.status).toBe(200);

    // Exactly one processed txn, one reward, one credit ledger entry.
    expect(await ProcessedTxnModel.countDocuments({ _id: paymentId })).toBe(1);
    expect(await CreatorRewardModel.countDocuments({ paymentId })).toBe(1);
    expect(
      await CreditLedgerModel.countDocuments({
        creatorId,
        type: "credit",
        referenceType: "reward",
      }),
    ).toBe(1);
    // 10% of pre-GST ₹4,999 = 49_990 paise.
    expect(await getBalance(creatorId)).toBe(49_990);

    // Course was granted exactly once (no duplicate ownedCourses entries).
    const user = await UserModel.findById(buyerId).lean();
    const aiGrants = (user?.ownedCourses ?? []).filter((g) => g.course === "ai");
    expect(aiGrants).toHaveLength(1);
  });

  it("a /verify with a stale signature LOSES even if its webhook companion succeeds (forgery defense)", async () => {
    const creatorId = await activeCreator();
    const buyerId = "usr_race_forge";
    await UserModel.create({
      _id: buyerId,
      email: "forge@x.test",
      role: "student",
      name: "Forge",
      plan: "free",
      referredByCreatorId: creatorId,
      createdAt: new Date().toISOString(),
    });

    const orderId = "order_forge";
    const paymentId = "pay_forge";
    const expected = coursesPricing(["ai"]).totalInPaise;
    const notes = { userId: buyerId, kind: "courses", courses: "ai" };

    global.fetch = (async () => {
      return new Response(
        JSON.stringify({
          id: paymentId,
          order_id: orderId,
          status: "captured",
          amount: expected,
          currency: "INR",
          notes,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    vi.mocked(getServerSession).mockResolvedValue({ user: { id: buyerId, role: "student" } });
    const verifyReq = new Request("http://test.local/api/payments/razorpay/verify", {
      method: "POST",
      headers: {
        origin: "http://test.local",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: "deadbeef".repeat(8), // forged
      }),
    });
    const webhookRaw = JSON.stringify({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: paymentId,
            order_id: orderId,
            amount: expected,
            status: "captured",
            notes,
          },
        },
      },
    });
    const webhookReq = new Request(
      "http://test.local/api/payments/razorpay/webhook",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-razorpay-signature": createHmac("sha256", WEBHOOK_SECRET)
            .update(webhookRaw)
            .digest("hex"),
        },
        body: webhookRaw,
      },
    );

    const [verifyRes, webhookRes] = await Promise.all([
      verifyRoute(verifyReq, undefined),
      webhookRoute(webhookReq, undefined),
    ]);

    // /verify rejected outright; webhook still processed normally.
    expect(verifyRes.status).toBe(400);
    expect(webhookRes.status).toBe(200);
    expect(await ProcessedTxnModel.countDocuments({ _id: paymentId })).toBe(1);
    expect(await CreatorRewardModel.countDocuments({ paymentId })).toBe(1);
  });
});
