/**
 * Bootcamp **course** purchase pricing + fulfilment (Razorpay).
 *
 * Price is derived server-side from the bundle engine (shared/lib/courses.ts),
 * so the client never sends an amount. Fulfilment grants the resolved course
 * set to the buyer (idempotent via recordProcessedTxn) and — unlike jobs plans
 * — fires the creator referral reward on the pre-GST amount paid.
 */
import { GST_PERCENT, type BootcampCategory } from "@/shared/types";
import { computeTotalPaise } from "@/shared/lib/pricing";
import { resolveCart, isCourseId } from "@/shared/lib/courses";
import {
  grantCourses,
  notify,
  recordProcessedTxn,
  writeAuditLog,
} from "@/server/store";
import { logger } from "@/server/lib/logger";
import { checkAndCreateReward } from "@/server/creator/reward.service";
import type { FulfilResult } from "@/server/payments/subscription";

export interface CoursesPricing {
  baseInPaise: number;
  gstInPaise: number;
  totalInPaise: number;
  granted: BootcampCategory[];
  isEverything: boolean;
}

/** Drop anything that isn't a real course id (defense against tampered input). */
function sanitize(courses: readonly string[]): BootcampCategory[] {
  return courses.filter(isCourseId);
}

/**
 * Authoritative price for a course cart, in paise (pre-GST base from the
 * bundle engine + GST). Also returns the full granted set for display.
 *
 * `ownedCourses` is the buyer's existing valid course grants. Passing it
 * causes those courses to be stripped from the cart before pricing — so a
 * tampered client that re-adds a course the user already owns is silently
 * dropped instead of being double-charged. The order route MUST pass this.
 * Pricing tests + the pure unit shape (no `ownedCourses`) still resolve to
 * the legacy price so existing callers keep working.
 */
export function coursesPricing(
  courses: readonly string[],
  ownedCourses: readonly BootcampCategory[] = [],
): CoursesPricing {
  const owned = new Set(ownedCourses);
  const requestable = sanitize(courses).filter((c) => !owned.has(c));
  const { pricePaise, granted, isEverything } = resolveCart(requestable);
  const { baseInPaise, gstInPaise, totalInPaise } = computeTotalPaise({
    priceInPaise: pricePaise,
    gstPercent: GST_PERCENT,
  });
  return { baseInPaise, gstInPaise, totalInPaise, granted, isEverything };
}

export interface FulfilCoursesInput {
  provider: "razorpay" | "mock";
  paymentId: string;
  orderId: string;
  userId: string;
  courses: string[];
  amountPaise: number;
  via: "callback" | "webhook";
}

/**
 * Grant a course purchase exactly once. The reward base is the PRE-GST cart
 * price (what the bundle engine charges), matching how premium rewarded on its
 * pre-GST base.
 */
export async function fulfilCoursePurchase(
  input: FulfilCoursesInput,
): Promise<FulfilResult> {
  const { granted, pricePaise } = resolveCart(sanitize(input.courses));
  if (granted.length === 0) {
    return { ok: false, reason: "no_valid_courses" };
  }

  const record = await recordProcessedTxn({
    txnId: input.paymentId,
    provider: input.provider,
    orderId: input.orderId,
    userId: input.userId,
    plan: "courses",
    amountPaise: input.amountPaise,
    status: "success",
    via: input.via,
  });
  if (!record.firstTime) {
    return { ok: true, firstTime: false };
  }

  await grantCourses(input.userId, granted);

  await notify({
    userId: input.userId,
    kind: "plan_activated",
    priority: "high",
    title: "Courses unlocked 🎉",
    body: `You now own ${granted.length} course${granted.length === 1 ? "" : "s"}. Jump into your first cohort.`,
    link: "/bootcamps",
  });
  await writeAuditLog({
    actorId: input.userId,
    actorRole: "student",
    action: "billing.courses.activated",
    targetType: "user",
    targetId: input.userId,
    summary: `Granted courses [${granted.join(", ")}] via ${input.provider} ${input.paymentId} (${input.via})`,
  });

  // Courses DO reward the referring creator — base = pre-GST amount paid.
  try {
    await checkAndCreateReward({
      userId: input.userId,
      paymentId: input.paymentId,
      orderId: input.orderId,
      amountPaise: input.amountPaise,
      basePaise: pricePaise,
    });
  } catch (err) {
    logger.warn(
      { err, paymentId: input.paymentId, userId: input.userId },
      "creator.course-reward-hook-failed",
    );
  }

  return { ok: true, firstTime: true };
}
