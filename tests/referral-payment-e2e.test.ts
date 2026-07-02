/**
 * End-to-end alignment: referral cookie → signup → attribution → purchase →
 * creator reward. This is the load-bearing seam between two separately-tested
 * systems (referrals + payments); a regression here costs creators money.
 *
 * Exercises (in order):
 *   1. /r/[code] mints a referral session and drops the ug_ref cookie.
 *   2. Signup reads the cookie, calls attachAttribution, sets
 *      User.referredByCreatorId — first-touch wins.
 *   3. A subsequent course purchase calls checkAndCreateReward, which credits
 *      the creator's ledger on the pre-GST cart price (jobs plans do NOT).
 *   4. Idempotency: webhook retries never double-grant or double-credit.
 *   5. Orphan signups (no cookie) → no reward. Expired sessions → no reward.
 *   6. Self-referral (creator's own purchase) → no reward.
 *   7. Refund event reverses the reward, balance returns to zero.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

import { GET as referralLanding } from "@/app/r/[code]/route";
import { POST as razorpayWebhook } from "@/app/api/payments/razorpay/webhook/route";
import {
  createReferralSession,
  attachAttribution,
} from "@/server/creator/referral.service";
import { createCreator } from "@/server/creator/creator.service";
import {
  ReferralSessionModel,
  CreatorProfileModel,
  CommissionAgreementModel,
  CreatorRewardModel,
  CreditLedgerModel,
} from "@/server/db/creator-models";
import { UserModel, ProcessedTxnModel } from "@/server/db/models";
import { fulfilCoursePurchase, coursesPricing } from "@/server/payments/courses";
import { fulfilJobsPlan, jobsPlanPricing } from "@/server/payments/subscription";
import { getRewardByPaymentId } from "@/server/creator/reward.service";
import { getBalance } from "@/server/creator/ledger.service";

const WEBHOOK_SECRET = "ref_e2e_wh_secret";

beforeAll(async () => {
  await Promise.all([
    CreatorProfileModel.createIndexes(),
    CommissionAgreementModel.createIndexes(),
    CreatorRewardModel.createIndexes(),
    CreditLedgerModel.createIndexes(),
    ReferralSessionModel.createIndexes(),
  ]);
});

beforeEach(() => {
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
  process.env.RAZORPAY_KEY_ID = "rzp_test_e2e";
  process.env.RAZORPAY_KEY_SECRET = "secret_e2e";
});
async function makeCreator(commissionPct = 10): Promise<{
  creatorId: string;
  referralCode: string;
}> {
  const res = await createCreator(
    {
      name: "Influencer",
      email: `inf_${Math.random().toString(36).slice(2, 9)}@x.test`,
      password: "TestPass1",
      commission: { type: "percentage", value: commissionPct },
    },
    "u_admin",
  );
  if (!res.ok) throw new Error("createCreator failed");
  // Flip pending → active so /r/<code> can mint sessions for them.
  await CreatorProfileModel.updateOne(
    { _id: res.profile.creatorId },
    { $set: { status: "active", acceptedAt: new Date().toISOString() } },
  );
  return {
    creatorId: res.profile.creatorId,
    referralCode: res.profile.referralCode,
  };
}

async function newStudent(id: string): Promise<void> {
  await UserModel.create({
    _id: id,
    email: `${id}@x.test`,
    role: "student",
    name: "Buyer",
    plan: "free",
    createdAt: new Date().toISOString(),
  });
}

function webhookReq(payload: Record<string, unknown>): Request {
  const raw = JSON.stringify(payload);
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

describe("Referral entry — /r/[code] → ug_ref cookie", () => {
  it("mints a session + sets ug_ref for an active creator's code", async () => {
    const { referralCode, creatorId } = await makeCreator();
    const req = new Request(`http://test.local/r/${referralCode}`);
    const res = await referralLanding(req, { params: { code: referralCode } });

    expect(res.status).toBe(307); // NextResponse.redirect
    const cookieHeader = res.headers.get("set-cookie") ?? "";
    expect(cookieHeader).toMatch(/ug_ref=/);
    expect(cookieHeader).toMatch(/HttpOnly/i);

    const token = /ug_ref=([^;]+)/.exec(cookieHeader)?.[1];
    expect(token).toBeTruthy();
    const session = await ReferralSessionModel.findById(token).lean();
    expect(session?.creatorId).toBe(creatorId);
    expect(session?.status).toBe("active");
  });

  it("redirects unknown codes home with NO cookie (no enumeration signal)", async () => {
    const req = new Request("http://test.local/r/not-a-real-code");
    const res = await referralLanding(req, { params: { code: "not-a-real-code" } });
    expect(res.status).toBe(307);
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).not.toMatch(/ug_ref=/);
  });
});

describe("Attribution + reward — happy path", () => {
  it("first-touch attribution → course purchase rewards the original creator", async () => {
    const { creatorId, referralCode } = await makeCreator(15);
    const session = await createReferralSession({ code: referralCode });
    if (!session) throw new Error("session not minted");

    const buyerId = "usr_first_touch";
    await newStudent(buyerId);
    const attach = await attachAttribution(buyerId, session.token);
    expect(attach).toEqual({ attributed: true, creatorId });

    // A purchase, fulfilled by the (idempotent) shared helper.
    const expected = coursesPricing(["ai"]);
    const r = await fulfilCoursePurchase({
      provider: "razorpay",
      paymentId: "pay_first_touch",
      orderId: "ord_first_touch",
      userId: buyerId,
      courses: ["ai"],
      amountPaise: expected.totalInPaise,
      via: "callback",
    });
    expect(r.ok).toBe(true);

    // 15% of pre-GST ₹4,999 = ₹749.85 = 74_985 paise.
    const reward = await getRewardByPaymentId("pay_first_touch");
    expect(reward?.calculatedAmount).toBe(74_985);
    expect(await getBalance(creatorId)).toBe(74_985);
  });

  it("a fresh visitor's second link click never overwrites the first attribution", async () => {
    const { creatorId: firstCreator, referralCode: firstCode } = await makeCreator();
    const { referralCode: secondCode } = await makeCreator();

    // Visitor opens the first link first (the one that should "win").
    const sFirst = await createReferralSession({ code: firstCode });
    if (!sFirst) throw new Error("no session");
    const buyerId = "usr_two_clicks";
    await newStudent(buyerId);
    await attachAttribution(buyerId, sFirst.token);

    // Same buyer, second link clicked after signup. Should be ignored.
    const sSecond = await createReferralSession({ code: secondCode });
    if (!sSecond) throw new Error("no session");
    const second = await attachAttribution(buyerId, sSecond.token);
    expect(second).toEqual({ attributed: false, reason: "already_attributed" });

    const user = await UserModel.findById(buyerId).lean();
    expect(user?.referredByCreatorId).toBe(firstCreator);
  });

  it("orphan signup (no cookie / no attribution) → no reward fires", async () => {
    const buyerId = "usr_orphan";
    await newStudent(buyerId);

    const expected = coursesPricing(["ai"]).totalInPaise;
    await fulfilCoursePurchase({
      provider: "razorpay",
      paymentId: "pay_orphan",
      orderId: "ord_orphan",
      userId: buyerId,
      courses: ["ai"],
      amountPaise: expected,
      via: "callback",
    });
    expect(await getRewardByPaymentId("pay_orphan")).toBeUndefined();
  });

  it("attribution from an expired session is refused → no reward", async () => {
    const { creatorId } = await makeCreator();
    const buyerId = "usr_expired";
    await newStudent(buyerId);
    await ReferralSessionModel.create({
      _id: "tok_expired_e2e",
      sessionToken: "tok_expired_e2e",
      creatorId,
      status: "active",
      expiresAt: new Date(Date.now() - 1_000).toISOString(), // 1s ago
      createdAt: new Date(Date.now() - 100_000).toISOString(),
    });
    const r = await attachAttribution(buyerId, "tok_expired_e2e");
    expect(r).toEqual({ attributed: false, reason: "expired" });

    // Purchase proceeds normally but mints no reward.
    const expected = coursesPricing(["ai"]).totalInPaise;
    await fulfilCoursePurchase({
      provider: "razorpay",
      paymentId: "pay_expired",
      orderId: "ord_expired",
      userId: buyerId,
      courses: ["ai"],
      amountPaise: expected,
      via: "callback",
    });
    expect(await getRewardByPaymentId("pay_expired")).toBeUndefined();
  });
});

describe("Attribution + reward — product-specific rules", () => {
  it("jobs plans NEVER reward, even with attribution (ground rule §0.5)", async () => {
    const { creatorId, referralCode } = await makeCreator(25);
    const session = await createReferralSession({ code: referralCode });
    if (!session) throw new Error("no session");
    const buyerId = "usr_jobs_only";
    await newStudent(buyerId);
    await attachAttribution(buyerId, session.token);

    const expected = jobsPlanPricing("jobs_annual").totalInPaise;
    await fulfilJobsPlan({
      provider: "razorpay",
      paymentId: "pay_jobs_only",
      orderId: "ord_jobs_only",
      userId: buyerId,
      plan: "jobs_annual",
      amountPaise: expected,
      via: "callback",
    });

    expect(await getRewardByPaymentId("pay_jobs_only")).toBeUndefined();
    expect(await getBalance(creatorId)).toBe(0);
  });

  it("self-referral (creator buying their own course) → no reward (§9.1)", async () => {
    const { creatorId } = await makeCreator();
    // Manually attribute the creator's own user id to themselves.
    await UserModel.updateOne(
      { _id: creatorId },
      { $set: { referredByCreatorId: creatorId } },
    );
    const expected = coursesPricing(["ai"]).totalInPaise;
    await fulfilCoursePurchase({
      provider: "razorpay",
      paymentId: "pay_self_buy",
      orderId: "ord_self_buy",
      userId: creatorId,
      courses: ["ai"],
      amountPaise: expected,
      via: "callback",
    });
    expect(await getRewardByPaymentId("pay_self_buy")).toBeUndefined();
    expect(await getBalance(creatorId)).toBe(0);
  });
});

describe("Webhook idempotency + refund — across the full pipeline", () => {
  it("a webhook redelivery never double-rewards", async () => {
    const { creatorId, referralCode } = await makeCreator(15);
    const session = await createReferralSession({ code: referralCode });
    if (!session) throw new Error("no session");
    const buyerId = "usr_redeliver";
    await newStudent(buyerId);
    await attachAttribution(buyerId, session.token);

    const expected = coursesPricing(["ai"]).totalInPaise;
    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_redeliver",
            order_id: "ord_redeliver",
            amount: expected,
            status: "captured",
            notes: { userId: buyerId, kind: "courses", courses: "ai" },
          },
        },
      },
    };

    const a = await razorpayWebhook(webhookReq(payload), undefined);
    const b = await razorpayWebhook(webhookReq(payload), undefined); // same event, re-delivered
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);

    expect(await ProcessedTxnModel.countDocuments({ _id: "pay_redeliver" })).toBe(1);
    expect(await CreatorRewardModel.countDocuments({ paymentId: "pay_redeliver" })).toBe(1);
    expect(await getBalance(creatorId)).toBe(74_985); // 15% of ₹4,999
  });

  it("refund webhook reverses the reward end-to-end (purchase + refund through webhook)", async () => {
    const { creatorId, referralCode } = await makeCreator(15);
    const session = await createReferralSession({ code: referralCode });
    if (!session) throw new Error("no session");
    const buyerId = "usr_refund_pipe";
    await newStudent(buyerId);
    await attachAttribution(buyerId, session.token);

    const expected = coursesPricing(["ai"]).totalInPaise;
    await razorpayWebhook(webhookReq({
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_refund_pipe",
            order_id: "ord_refund_pipe",
            amount: expected,
            status: "captured",
            notes: { userId: buyerId, kind: "courses", courses: "ai" },
          },
        },
      },
    }), undefined);
    expect(await getBalance(creatorId)).toBe(74_985);

    // Now the refund event from the provider.
    const refund = await razorpayWebhook(webhookReq({
      event: "refund.processed",
      payload: { refund: { entity: { payment_id: "pay_refund_pipe" } } },
    }), undefined);
    expect(refund.status).toBe(200);
    expect(await getBalance(creatorId)).toBe(0);
    const reward = await getRewardByPaymentId("pay_refund_pipe");
    expect(reward?.status).toBe("reversed");
  });
});
