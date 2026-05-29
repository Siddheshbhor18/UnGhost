import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { getUserById, cancelUserPlanRenewal, writeAuditLog } from "@/server/store";

export const runtime = "nodejs";

/**
 * POST /api/billing/cancel
 *
 * Student-only. For Pro (monthly), marks `planRenewalCancelled: true` so
 * the daily expiry cron will demote to Free when `planExpiresAt` hits.
 * Until expiry the user keeps Pro access — no proration, no immediate
 * revoke (matches industry convention).
 *
 * Premium (lifetime) cannot be "cancelled" — the user keeps access. To get
 * a refund on Premium they must contact support; we don't allow self-serve
 * destruction of paid lifetime access.
 */
async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  const user = await getUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (user.plan !== "pro") {
    return NextResponse.json(
      { error: "not_cancellable", plan: user.plan },
      { status: 400 },
    );
  }
  if (user.planRenewalCancelled) {
    return NextResponse.json(
      { ok: true, alreadyCancelled: true, plan: user.plan, planExpiresAt: user.planExpiresAt },
    );
  }

  await cancelUserPlanRenewal(user.id);
  await writeAuditLog({
    actorId: user.id,
    actorRole: "student",
    action: "billing.pro.renewal-cancelled",
    targetType: "user",
    targetId: user.id,
    summary: `Pro renewal cancelled; expires ${user.planExpiresAt ?? "?"}`,
  });

  return NextResponse.json({
    ok: true,
    plan: user.plan,
    planExpiresAt: user.planExpiresAt,
    message: `Your paid plan stays active until ${user.planExpiresAt ?? "expiry"}. After that you'll move to Free.`,
  });
}

export const POST = withRateLimit(
  { bucket: "billing.cancel", limit: 5, windowSec: 600, by: "user" },
  withApiErrorTracking(handler),
);
