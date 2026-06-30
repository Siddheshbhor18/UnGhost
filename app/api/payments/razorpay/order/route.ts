import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { getUserById } from "@/server/store";
import { isActiveUser } from "@/server/auth/account-status";
import { createOrder } from "@/server/integrations/payments/razorpay";
import { jobsPlanPricing } from "@/server/payments/subscription";
import { coursesPricing } from "@/server/payments/courses";
import { isCourseId } from "@/shared/lib/courses";

export const runtime = "nodejs";

/**
 * Two purchasable kinds, both priced entirely server-side (the client never
 * sends an amount):
 *   - jobs   → a Jobs plan (₹149 quarterly / ₹299 annual).
 *   - courses→ a cart of bootcamp courses; price + grants resolved by the
 *              bundle engine. `courses` is the SELECTED set (free unlocks are
 *              derived on fulfilment from the same set).
 */
const Input = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("jobs"),
    plan: z.enum(["jobs_quarterly", "jobs_annual"]),
  }),
  z.object({
    kind: z.literal("courses"),
    courses: z.array(z.string().max(40)).min(1).max(6),
  }),
]);

/**
 * POST /api/payments/razorpay/order — create a Razorpay order. Returns
 * { orderId, amount, currency, keyId } for checkout.js. Auth + CSRF + rate
 * limited like every state-changing route here.
 */
async function postHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "student") {
    return NextResponse.json({ error: "students_only" }, { status: 403 });
  }

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const user = await getUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!isActiveUser(user)) {
    return NextResponse.json({ error: "account_inactive" }, { status: 403 });
  }

  let totalInPaise: number;
  let notes: Record<string, string>;

  if (data.kind === "jobs") {
    const pricing = jobsPlanPricing(data.plan);
    totalInPaise = pricing.totalInPaise;
    notes = { userId: user.id, kind: "jobs", plan: data.plan };
  } else {
    const courses = data.courses.filter(isCourseId);
    if (courses.length === 0) {
      return NextResponse.json({ error: "empty_cart" }, { status: 400 });
    }
    // Strip anything the buyer already owns — defends against a tampered
    // client re-adding a course they hold. The pricing engine treats
    // owned ids as if they weren't in the cart.
    const nowMs = Date.now();
    const ownedIds = (user.ownedCourses ?? [])
      .filter((g) => Date.parse(g.expiresAt) > nowMs)
      .map((g) => g.course);
    const pricing = coursesPricing(courses, ownedIds);
    if (pricing.totalInPaise <= 0) {
      return NextResponse.json({ error: "empty_cart" }, { status: 400 });
    }
    totalInPaise = pricing.totalInPaise;
    notes = { userId: user.id, kind: "courses", courses: courses.join(",") };
  }

  const result = await createOrder({
    amountPaise: totalInPaise,
    currency: "INR",
    receipt: `ug_${user.id}_${Date.now()}`.slice(0, 40),
    notes,
  });

  if (!result.ok) {
    if (result.kind === "auth") {
      return NextResponse.json({ error: "razorpay_auth_failed" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "order_create_failed", reason: result.error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    orderId: result.orderId,
    amount: result.amount,
    currency: result.currency,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}

// 15 orders / 5 min / user — absorbs double-clicks + modal retries.
export const POST = withRateLimit(
  { bucket: "razorpay.order", limit: 15, windowSec: 300, by: "user" },
  withApiErrorTracking(postHandler),
);
