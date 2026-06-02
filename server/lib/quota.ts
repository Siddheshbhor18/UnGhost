/**
 * Subscription-plan quota helper.
 *
 * Centralises every gate so the rules live in one place. Every paid feature
 * goes through one of these functions; the only knob to twist later is the
 * `PLAN_LIMITS` table in shared/types.
 *
 *   - effectivePlan(user) — premium (lifetime) or free; nothing else
 *   - planAllowsCoach(user)
 *   - planAllowsQA(user)
 *   - planAllowsFreeBootcamp(user)
 *   - checkApplyQuota(user) → { allowed, remaining, reason? }
 */
import { ApplicationModel } from "@/server/db/models";
import type { SubscriptionPlan, User } from "@/shared/types";
import { PLAN_LIMITS } from "@/shared/types";

/**
 * Returns the user's *effective* plan. Two tiers only: premium (lifetime) or
 * free. Anything that isn't an active premium — including any legacy "pro"
 * value still sitting on an old record — collapses to free.
 */
export function effectivePlan(user: Pick<User, "plan" | "planExpiresAt" | "planType">): SubscriptionPlan {
  return user.plan === "premium" ? "premium" : "free";
}

export function planAllowsCoach(user: User): boolean {
  return PLAN_LIMITS[effectivePlan(user)].aiCoach;
}

export function planAllowsQA(user: User): boolean {
  return PLAN_LIMITS[effectivePlan(user)].questionAndAnswer;
}

export function planAllowsFreeBootcamp(user: User): boolean {
  return PLAN_LIMITS[effectivePlan(user)].bootcampsIncluded;
}

export interface ApplyQuotaResult {
  allowed: boolean;
  /** Remaining applications under the current cap. -1 = unlimited. */
  remaining: number;
  /** Total cap visible to UI. -1 = unlimited. */
  cap: number;
  /** Window — "trial" / "monthly" / "unlimited". */
  windowKind: "trial" | "monthly" | "unlimited";
  /** Reason if disallowed (UI hint). */
  reason?: "trial_exhausted" | "monthly_exhausted";
}

/**
 * Decide whether a student can submit one more application.
 *
 *   - free    → counts ALL applications they've ever submitted (lifetime cap)
 *   - premium → always allowed
 */
export async function checkApplyQuota(user: User): Promise<ApplyQuotaResult> {
  const plan = effectivePlan(user);
  const limits = PLAN_LIMITS[plan];
  if (limits.applicationCap.kind === "unlimited") {
    return { allowed: true, remaining: -1, cap: -1, windowKind: "unlimited" };
  }

  if (limits.applicationCap.kind === "trial") {
    // Lifetime count — every application the student has ever submitted,
    // EXCEPT ones returned after an SLA breach (those credits go back to the
    // student, so they must not count against the cap — matches the UI which
    // filters `!a.slaRefundIssued`).
    const used = await ApplicationModel.countDocuments({
      studentId: user.id,
      slaRefundIssued: { $ne: true },
    });
    const cap = limits.applicationCap.count;
    const remaining = Math.max(0, cap - used);
    return {
      allowed: remaining > 0,
      remaining,
      cap,
      windowKind: "trial",
      reason: remaining === 0 ? "trial_exhausted" : undefined,
    };
  }

  // monthly — rolling 30-day window.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const used = await ApplicationModel.countDocuments({
    studentId: user.id,
    createdAt: { $gte: since },
    slaRefundIssued: { $ne: true },
  });
  const cap = limits.applicationCap.count;
  const remaining = Math.max(0, cap - used);
  return {
    allowed: remaining > 0,
    remaining,
    cap,
    windowKind: "monthly",
    reason: remaining === 0 ? "monthly_exhausted" : undefined,
  };
}
