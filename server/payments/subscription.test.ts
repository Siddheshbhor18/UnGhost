import { describe, expect, it } from "vitest";
import { UserModel, ProcessedTxnModel } from "@/server/db/models";
import { getUserById } from "@/server/store";
import {
  premiumAnnualPricing,
  fulfilPremiumPurchase,
} from "./subscription";
import { PREMIUM_PLAN_DURATION_DAYS } from "@/shared/types";

describe("premiumAnnualPricing", () => {
  it("computes ₹4,999 base + 18% GST with no coupon", () => {
    const p = premiumAnnualPricing();
    expect(p.baseInPaise).toBe(499900);
    expect(p.gstInPaise).toBe(89982);
    expect(p.totalInPaise).toBe(589882);
    expect(p.percentOff).toBe(0);
  });

  it("ignores unknown coupons (full price)", () => {
    const p = premiumAnnualPricing("NOTAREALCODE");
    expect(p.percentOff).toBe(0);
    expect(p.totalInPaise).toBe(589882);
  });
});

async function makeStudent(id: string) {
  await UserModel.create({
    _id: id,
    email: `${id}@demo.test`,
    role: "student",
    name: "Test Student",
    plan: "free",
  });
}

describe("fulfilPremiumPurchase", () => {
  it("activates annual premium with a ~1-year expiry on first call", async () => {
    await makeStudent("u_fulfil_1");
    const before = Date.now();

    const res = await fulfilPremiumPurchase({
      provider: "razorpay",
      paymentId: "pay_fulfil_1",
      orderId: "order_fulfil_1",
      userId: "u_fulfil_1",
      amountPaise: 589882,
      via: "callback",
    });

    expect(res).toEqual({ ok: true, firstTime: true });

    const user = await getUserById("u_fulfil_1");
    expect(user?.plan).toBe("premium");
    expect(user?.planType).toBe("annual");
    expect(user?.lastBillingTxnId).toBe("pay_fulfil_1");

    const expiresAt = Date.parse(user!.planExpiresAt!);
    const expectedMin = before + (PREMIUM_PLAN_DURATION_DAYS - 1) * 86400_000;
    const expectedMax =
      Date.now() + (PREMIUM_PLAN_DURATION_DAYS + 1) * 86400_000;
    expect(expiresAt).toBeGreaterThan(expectedMin);
    expect(expiresAt).toBeLessThan(expectedMax);
  });

  it("is idempotent — the same payment id never grants twice", async () => {
    await makeStudent("u_fulfil_2");

    const first = await fulfilPremiumPurchase({
      provider: "razorpay",
      paymentId: "pay_dupe",
      orderId: "order_dupe",
      userId: "u_fulfil_2",
      amountPaise: 589882,
      via: "callback",
    });
    // Second arrival (e.g. webhook racing the browser callback).
    const second = await fulfilPremiumPurchase({
      provider: "razorpay",
      paymentId: "pay_dupe",
      orderId: "order_dupe",
      userId: "u_fulfil_2",
      amountPaise: 589882,
      via: "webhook",
    });

    expect(first.ok && first.firstTime).toBe(true);
    expect(second.ok && (second as { firstTime: boolean }).firstTime).toBe(
      false,
    );

    // Exactly one ledger row for this payment.
    const count = await ProcessedTxnModel.countDocuments({ _id: "pay_dupe" });
    expect(count).toBe(1);
  });
});
