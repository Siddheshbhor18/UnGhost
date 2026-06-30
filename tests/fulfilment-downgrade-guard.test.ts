/**
 * Defense-in-depth on the fulfilment layer. The order route is the primary
 * gate against re-buys / downgrades, but a stale order created before the
 * gate shipped — or a future admin-issued order — can still arrive at
 * `fulfilJobsPlan` / `fulfilPremiumPurchase`. The fulfilment layer MUST NOT
 * silently downgrade an existing higher-rank plan or overlay an annual term
 * onto a lifetime grant.
 *
 * Pinned behaviour:
 *   - jobs fulfilment: paying for a strictly-lower-rank plan records the txn
 *     (idempotent, no retry storm) but skips the plan write; user keeps
 *     their current tier; an audit log + warning fires for manual refund.
 *   - jobs fulfilment: same-rank arrival (renewal) IS allowed — extends
 *     planExpiresAt, doesn't shrink it.
 *   - premium fulfilment: a fixed-term ₹4,999 capture against a LIFETIME
 *     premium grant (no planExpiresAt) is refused — would silently shorten
 *     access. A normal (free → premium) capture still activates.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { UserModel } from "@/server/db/models";
import { fulfilJobsPlan, fulfilPremiumPurchase } from "@/server/payments/subscription";
import { getUserById } from "@/server/store";
import {
  CreatorProfileModel,
  CommissionAgreementModel,
  CreatorRewardModel,
  CreditLedgerModel,
} from "@/server/db/creator-models";

beforeAll(async () => {
  await Promise.all([
    CreatorProfileModel.createIndexes(),
    CommissionAgreementModel.createIndexes(),
    CreatorRewardModel.createIndexes(),
    CreditLedgerModel.createIndexes(),
  ]);
});

async function seedStudent(
  id: string,
  patch: {
    plan?: "free" | "jobs_quarterly" | "jobs_annual" | "premium";
    planType?: "monthly" | "quarterly" | "annual" | "lifetime" | "free";
    planExpiresAt?: string | null;
  } = {},
): Promise<void> {
  await UserModel.create({
    _id: id,
    email: `${id}@x.test`,
    role: "student",
    name: "Buyer",
    plan: patch.plan ?? "free",
    planType: patch.planType,
    planExpiresAt: patch.planExpiresAt ?? undefined,
    createdAt: new Date().toISOString(),
  });
}

const future = (days: number): string =>
  new Date(Date.now() + days * 86_400_000).toISOString();

describe("fulfilJobsPlan — never silently downgrade an existing higher-rank plan", () => {
  it("refuses to overwrite premium with jobs_annual; user keeps premium", async () => {
    await seedStudent("u_dg_prem", { plan: "premium", planType: "lifetime" });

    const res = await fulfilJobsPlan({
      provider: "razorpay",
      paymentId: "pay_dg_prem",
      orderId: "order_dg_prem",
      userId: "u_dg_prem",
      plan: "jobs_annual",
      amountPaise: 35282,
      via: "webhook",
    });
    // Idempotency row still claimed (so retries no-op) — but plan untouched.
    expect(res).toEqual({ ok: true, firstTime: true });

    const user = await getUserById("u_dg_prem");
    expect(user?.plan).toBe("premium");
    expect(user?.planType).toBe("lifetime");
    expect(user?.planExpiresAt).toBeUndefined();
  });

  it("refuses to overwrite jobs_annual with jobs_quarterly; user keeps the longer term", async () => {
    const originalExpiry = future(200);
    await seedStudent("u_dg_q", {
      plan: "jobs_annual",
      planType: "annual",
      planExpiresAt: originalExpiry,
    });

    const res = await fulfilJobsPlan({
      provider: "razorpay",
      paymentId: "pay_dg_q",
      orderId: "order_dg_q",
      userId: "u_dg_q",
      plan: "jobs_quarterly",
      amountPaise: 17582,
      via: "callback",
    });
    expect(res).toEqual({ ok: true, firstTime: true });

    const user = await getUserById("u_dg_q");
    expect(user?.plan).toBe("jobs_annual");
    expect(user?.planExpiresAt).toBe(originalExpiry);
  });

  it("ALLOWS same-rank arrival (renewal) — extends planExpiresAt instead of shrinking it", async () => {
    await seedStudent("u_renew_q", {
      plan: "jobs_quarterly",
      planType: "quarterly",
      planExpiresAt: future(10),
    });

    const before = Date.now();
    const res = await fulfilJobsPlan({
      provider: "razorpay",
      paymentId: "pay_renew_q",
      orderId: "order_renew_q",
      userId: "u_renew_q",
      plan: "jobs_quarterly",
      amountPaise: 17582,
      via: "callback",
    });
    expect(res).toEqual({ ok: true, firstTime: true });

    const user = await getUserById("u_renew_q");
    expect(user?.plan).toBe("jobs_quarterly");
    // 90-day cadence — new expiry must be well past the old +10d window.
    const newExpiry = Date.parse(user!.planExpiresAt!);
    expect(newExpiry).toBeGreaterThan(before + 89 * 86_400_000);
  });

  it("ALLOWS upgrade from quarterly → annual — activates the longer term", async () => {
    await seedStudent("u_up_a", {
      plan: "jobs_quarterly",
      planType: "quarterly",
      planExpiresAt: future(30),
    });

    const before = Date.now();
    const res = await fulfilJobsPlan({
      provider: "razorpay",
      paymentId: "pay_up_a",
      orderId: "order_up_a",
      userId: "u_up_a",
      plan: "jobs_annual",
      amountPaise: 35282,
      via: "callback",
    });
    expect(res).toEqual({ ok: true, firstTime: true });

    const user = await getUserById("u_up_a");
    expect(user?.plan).toBe("jobs_annual");
    expect(Date.parse(user!.planExpiresAt!)).toBeGreaterThan(
      before + 364 * 86_400_000,
    );
  });

  it("ALLOWS the normal free → jobs_quarterly flow", async () => {
    await seedStudent("u_free_buy", { plan: "free" });
    const res = await fulfilJobsPlan({
      provider: "razorpay",
      paymentId: "pay_free_buy",
      orderId: "order_free_buy",
      userId: "u_free_buy",
      plan: "jobs_quarterly",
      amountPaise: 17582,
      via: "callback",
    });
    expect(res).toEqual({ ok: true, firstTime: true });

    const user = await getUserById("u_free_buy");
    expect(user?.plan).toBe("jobs_quarterly");
  });

  it("expired premium → counts as free for the rank check (allows upgrade purchase)", async () => {
    await seedStudent("u_exp_prem", {
      plan: "premium",
      planType: "annual",
      planExpiresAt: new Date(Date.now() - 86_400_000).toISOString(),
    });

    const res = await fulfilJobsPlan({
      provider: "razorpay",
      paymentId: "pay_exp_prem",
      orderId: "order_exp_prem",
      userId: "u_exp_prem",
      plan: "jobs_annual",
      amountPaise: 35282,
      via: "callback",
    });
    expect(res).toEqual({ ok: true, firstTime: true });

    const user = await getUserById("u_exp_prem");
    expect(user?.plan).toBe("jobs_annual");
  });
});

describe("fulfilPremiumPurchase — preserve lifetime grants", () => {
  it("refuses to overlay an annual term on a LIFETIME premium grant", async () => {
    await seedStudent("u_life", {
      plan: "premium",
      planType: "lifetime",
      // explicitly no planExpiresAt
    });

    const res = await fulfilPremiumPurchase({
      provider: "razorpay",
      paymentId: "pay_life_overlay",
      orderId: "order_life_overlay",
      userId: "u_life",
      amountPaise: 589882,
      via: "webhook",
    });
    expect(res).toEqual({ ok: true, firstTime: true });

    const user = await getUserById("u_life");
    expect(user?.plan).toBe("premium");
    expect(user?.planType).toBe("lifetime");
    expect(user?.planExpiresAt).toBeUndefined();
  });

  it("ALLOWS a normal free → premium activation (no existing grant to preserve)", async () => {
    await seedStudent("u_free_to_prem", { plan: "free" });

    const res = await fulfilPremiumPurchase({
      provider: "razorpay",
      paymentId: "pay_free_to_prem",
      orderId: "order_free_to_prem",
      userId: "u_free_to_prem",
      amountPaise: 589882,
      via: "callback",
    });
    expect(res).toEqual({ ok: true, firstTime: true });

    const user = await getUserById("u_free_to_prem");
    expect(user?.plan).toBe("premium");
    expect(user?.planType).toBe("annual");
    expect(user?.planExpiresAt).toBeTruthy();
  });
});
