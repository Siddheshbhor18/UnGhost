/**
 * Course purchase fulfilment — grants the resolved course set and fires the
 * creator reward on the PRE-GST amount paid (not the legacy ₹4,999 base).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { UserModel } from "@/server/db/models";
import {
  CreatorProfileModel,
  CommissionAgreementModel,
  CreatorRewardModel,
  CreditLedgerModel,
} from "@/server/db/creator-models";
import { createCreator } from "@/server/creator/creator.service";
import { getRewardByPaymentId } from "@/server/creator/reward.service";
import { getBalance } from "@/server/creator/ledger.service";
import { fulfilCoursePurchase, coursesPricing } from "@/server/payments/courses";

beforeAll(async () => {
  await Promise.all([
    CreatorProfileModel.createIndexes(),
    CommissionAgreementModel.createIndexes(),
    CreatorRewardModel.createIndexes(),
    CreditLedgerModel.createIndexes(),
  ]);
});

describe("fulfilCoursePurchase", () => {
  it("grants the resolved bundle and rewards on the pre-GST course price", async () => {
    const res = await createCreator(
      {
        name: "C",
        email: `c_${Math.random().toString(36).slice(2, 9)}@x.test`,
        password: "TestPass1",
        commission: { type: "percentage", value: 10 },
      },
      "u_admin",
    );
    if (!res.ok) throw new Error("createCreator failed");
    const creatorId = res.profile.creatorId;

    const userId = `usr_${Math.random().toString(36).slice(2, 10)}`;
    await UserModel.create({
      _id: userId,
      email: `${userId}@x.test`,
      role: "student",
      name: "S",
      referredByCreatorId: creatorId,
      createdAt: new Date().toISOString(),
    });

    const gross = coursesPricing(["ai"]).totalInPaise; // ₹5,000 + 18% GST
    const r = await fulfilCoursePurchase({
      provider: "mock",
      paymentId: "pay_course_1",
      orderId: "ord_1",
      userId,
      courses: ["ai"],
      amountPaise: gross,
      via: "callback",
    });
    expect(r.ok).toBe(true);

    // AI grants the business trio for free.
    const user = await UserModel.findById(userId).lean();
    expect((user?.ownedCourses ?? []).map((g) => g.course).sort()).toEqual(
      ["ai", "entrepreneurship", "marketing", "sales"].sort(),
    );
    // Every grant carries a future (3-month) expiry.
    expect((user?.ownedCourses ?? []).every((g) => Date.parse(g.expiresAt) > Date.now())).toBe(true);

    // Reward base = pre-GST ₹4,999 → 10% = ₹499.90 = 49990 paise.
    const reward = await getRewardByPaymentId("pay_course_1");
    expect(reward?.bootcampPrice).toBe(499_900);
    expect(reward?.calculatedAmount).toBe(49_990);
    expect(await getBalance(creatorId)).toBe(49_990);

    // Idempotent replay → no double grant / reward.
    const replay = await fulfilCoursePurchase({
      provider: "mock",
      paymentId: "pay_course_1",
      orderId: "ord_1",
      userId,
      courses: ["ai"],
      amountPaise: gross,
      via: "webhook",
    });
    expect(replay).toEqual({ ok: true, firstTime: false });
    expect(await getBalance(creatorId)).toBe(49_990);
  });
});
