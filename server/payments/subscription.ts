/**
 * Premium subscription pricing + fulfilment.
 *
 * One authoritative place to (a) compute the annual price the server will
 * charge and (b) grant the plan once a payment is confirmed. Both the
 * browser-verify route and the Razorpay webhook call `fulfilPremiumPurchase`,
 * which is idempotent via `recordProcessedTxn` — so a payment is fulfilled
 * exactly once no matter how many times (or from how many paths) it arrives.
 */
import {
  PLAN_PRICING,
  PLAN_RANK,
  PREMIUM_GST_PERCENT,
  PREMIUM_PLAN_DURATION_DAYS,
  GST_PERCENT,
  type PurchasableJobsPlan,
} from "@/shared/types";
import { applyCoupon, computeTotalPaise } from "@/shared/lib/pricing";
import {
  activateUserPlan,
  getUserById,
  notify,
  recordProcessedTxn,
  writeAuditLog,
} from "@/server/store";
import { effectivePlan } from "@/server/lib/quota";
import { logger } from "@/server/lib/logger";
import { checkAndCreateReward } from "@/server/creator/reward.service";

export interface PremiumPricing {
  baseInPaise: number;
  gstInPaise: number;
  totalInPaise: number;
  percentOff: number;
}

/**
 * Authoritative annual price for Premium, in paise. Coupon (if any) is applied
 * to the pre-GST base, then GST is added — so a discount lowers the GST too.
 * This is the ONLY price the order route trusts; the client never sets it.
 */
export function premiumAnnualPricing(coupon?: string | null): PremiumPricing {
  const { basePaise, percentOff } = applyCoupon(
    PLAN_PRICING.premium.amountINR * 100,
    coupon,
  );
  const { baseInPaise, gstInPaise, totalInPaise } = computeTotalPaise({
    priceInPaise: basePaise,
    gstPercent: PREMIUM_GST_PERCENT,
  });
  return { baseInPaise, gstInPaise, totalInPaise, percentOff };
}

export interface FulfilInput {
  provider: "razorpay" | "mock";
  /** Razorpay payment id — the unique, idempotent fulfilment key. */
  paymentId: string;
  orderId: string;
  userId: string;
  /** Amount actually captured, in paise (for the audit trail). */
  amountPaise: number;
  via: "callback" | "webhook";
}

export type FulfilResult =
  | { ok: true; firstTime: boolean }
  | { ok: false; reason: string };

/**
 * Grant Premium for one purchase, exactly once.
 *
 * `recordProcessedTxn` inserts a row keyed on the payment id; the first caller
 * wins and runs the side effects (activate + notify + audit). Any later caller
 * (the webhook racing the browser callback, or a Razorpay webhook retry) sees
 * `firstTime: false` and no-ops. Safe under concurrency — Mongo's unique
 * constraint resolves the race.
 *
 * Callers MUST verify the signature AND that the captured amount matches the
 * expected price BEFORE calling this. Fulfilment does not re-price.
 */
export async function fulfilPremiumPurchase(
  input: FulfilInput,
): Promise<FulfilResult> {
  const record = await recordProcessedTxn({
    txnId: input.paymentId,
    provider: input.provider,
    orderId: input.orderId,
    userId: input.userId,
    plan: "premium",
    amountPaise: input.amountPaise,
    status: "success",
    via: input.via,
  });

  if (!record.firstTime) {
    logger.info(
      { paymentId: input.paymentId, userId: input.userId, via: input.via },
      "razorpay.fulfil-already-processed",
    );
    return { ok: true, firstTime: false };
  }

  // Defense in depth: never overwrite a LIFETIME premium grant with a
  // fixed-term one. Lifetime users have no `planExpiresAt`; activating an
  // annual purchase would set one and silently shorten their access.
  // (Annual → annual re-buys ARE allowed — they extend planExpiresAt, which
  // is the renewal flow operations may use manually.)
  const userBefore = await getUserById(input.userId);
  if (userBefore && userBefore.plan === "premium" && !userBefore.planExpiresAt) {
    logger.warn(
      { userId: input.userId, paymentId: input.paymentId, via: input.via },
      "razorpay.fulfil-skipped-lifetime-overlay",
    );
    await writeAuditLog({
      actorId: input.userId,
      actorRole: "student",
      action: "billing.premium.lifetime-preserved",
      targetType: "user",
      targetId: input.userId,
      summary: `Refused to overlay lifetime premium with annual term via ${input.paymentId} (${input.via}). Manual refund required.`,
    });
    await notify({
      userId: input.userId,
      kind: "system",
      priority: "high",
      title: "Payment received — your lifetime access is safe",
      body: "You already have lifetime Premium. Support will reach out about a refund — your access hasn't changed.",
      link: "/student/settings",
    });
    return { ok: true, firstTime: true };
  }

  await activateUserPlan(input.userId, "premium", input.paymentId, {
    durationDays: PREMIUM_PLAN_DURATION_DAYS,
  });

  await notify({
    userId: input.userId,
    kind: "plan_activated",
    priority: "high",
    title: "Premium unlocked 🎉",
    body: "Unlimited applications + AI Coach + every bootcamp, for the next 12 months.",
    link: "/dashboard",
  });

  await writeAuditLog({
    actorId: input.userId,
    actorRole: "student",
    action: "billing.premium.activated",
    targetType: "user",
    targetId: input.userId,
    summary: `Activated annual Premium via Razorpay ${input.paymentId} (${input.via})`,
    meta: undefined,
  });

  logger.info(
    {
      paymentId: input.paymentId,
      userId: input.userId,
      amountPaise: input.amountPaise,
      via: input.via,
    },
    "razorpay.fulfil-activated",
  );

  // Creator reward (best-effort, never blocks fulfilment). If this purchaser
  // was referred by a creator, create the pending reward + credit. Idempotent
  // via the unique paymentId index, so webhook retries can't double-reward.
  try {
    const reward = await checkAndCreateReward({
      userId: input.userId,
      paymentId: input.paymentId,
      orderId: input.orderId,
      amountPaise: input.amountPaise,
    });
    if (reward.created) {
      logger.info(
        { paymentId: input.paymentId, rewardId: reward.reward.id },
        "creator.reward-created",
      );
    }
  } catch (err) {
    logger.warn(
      { err, paymentId: input.paymentId, userId: input.userId },
      "creator.reward-hook-failed",
    );
  }

  return { ok: true, firstTime: true };
}

/**
 * Authoritative price for a Jobs plan (₹149 quarterly / ₹299 annual), in paise.
 * No coupons on jobs plans. GST added on the base.
 */
export function jobsPlanPricing(plan: PurchasableJobsPlan): PremiumPricing {
  const base = PLAN_PRICING[plan].amountINR * 100;
  const { baseInPaise, gstInPaise, totalInPaise } = computeTotalPaise({
    priceInPaise: base,
    gstPercent: GST_PERCENT,
  });
  return { baseInPaise, gstInPaise, totalInPaise, percentOff: 0 };
}

export interface FulfilJobsInput {
  provider: "razorpay" | "mock";
  paymentId: string;
  orderId: string;
  userId: string;
  plan: PurchasableJobsPlan;
  amountPaise: number;
  via: "callback" | "webhook";
}

/**
 * Grant a Jobs plan for one purchase, exactly once (idempotent via
 * recordProcessedTxn). Jobs products NEVER generate a creator reward
 * (ground rule §0.5) — note the absence of any reward hook here.
 */
export async function fulfilJobsPlan(
  input: FulfilJobsInput,
): Promise<FulfilResult> {
  const record = await recordProcessedTxn({
    txnId: input.paymentId,
    provider: input.provider,
    orderId: input.orderId,
    userId: input.userId,
    plan: input.plan,
    amountPaise: input.amountPaise,
    status: "success",
    via: input.via,
  });
  if (!record.firstTime) {
    return { ok: true, firstTime: false };
  }

  // Defense in depth: the order route already blocks downgrades/sideways
  // purchases, but an in-flight order created before that gate shipped — or
  // any future admin-issued order — could still arrive here. Never DOWNGRADE
  // an existing higher-rank plan. Same-rank arrivals are allowed (treated as
  // a renewal that extends planExpiresAt). Strictly lower rank → record the
  // txn (so retries don't loop) and skip the plan write; log loudly so ops
  // can refund manually.
  const userBefore = await getUserById(input.userId);
  const currentPlan = userBefore ? effectivePlan(userBefore) : "free";
  if (PLAN_RANK[currentPlan] > PLAN_RANK[input.plan]) {
    logger.warn(
      {
        userId: input.userId,
        currentPlan,
        paidFor: input.plan,
        paymentId: input.paymentId,
        via: input.via,
      },
      "razorpay.fulfil-skipped-downgrade",
    );
    await writeAuditLog({
      actorId: input.userId,
      actorRole: "student",
      action: "billing.jobs.downgrade-blocked",
      targetType: "user",
      targetId: input.userId,
      summary: `Refused to downgrade ${currentPlan} → ${input.plan} via ${input.provider} ${input.paymentId} (${input.via}). Manual refund required.`,
    });
    // Notify the buyer that their payment is held — admin will reconcile.
    await notify({
      userId: input.userId,
      kind: "system",
      priority: "high",
      title: "Payment received — no plan change needed",
      body: `You already have ${currentPlan} access (better than the plan you just paid for). Support will reach out about a refund.`,
      link: "/student/settings",
    });
    return { ok: true, firstTime: true };
  }

  await activateUserPlan(input.userId, input.plan, input.paymentId, {
    durationDays: PLAN_PRICING[input.plan].durationDays ?? undefined,
  });

  const label =
    input.plan === "jobs_annual" ? "1 year" : "3 months";
  await notify({
    userId: input.userId,
    kind: "plan_activated",
    priority: "high",
    title: `Jobs unlocked — ${label} 🎉`,
    body: "Unlimited applications, AI Coach, and Q&A for your job search.",
    link: "/dashboard",
  });
  await writeAuditLog({
    actorId: input.userId,
    actorRole: "student",
    action: "billing.jobs.activated",
    targetType: "user",
    targetId: input.userId,
    summary: `Activated ${input.plan} via ${input.provider} ${input.paymentId} (${input.via})`,
  });
  return { ok: true, firstTime: true };
}
