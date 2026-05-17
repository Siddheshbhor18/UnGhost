import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  sweepExpiredPlans,
  listUsersExpiringSoon,
  notify,
  writeAuditLog,
} from "@/server/store";
import { sweepHardDeletes } from "@/server/auth/dpdp";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

/**
 * Subscription expiry sweep.
 *
 * Runs daily (Vercel cron) and does two things:
 *   1. Demote any Pro user whose planExpiresAt has passed → Free.
 *      Notifies them so they can re-upgrade.
 *   2. Warn any Pro user expiring inside the next 48h via notification +
 *      (future) email so they can renew before losing access.
 *
 * Idempotent — running twice in the same hour does nothing extra (each user
 * is only in the expired bucket once because the demote clears
 * planExpiresAt).
 *
 * Authorisation matches sla-sweep: Vercel cron uses CRON_SECRET bearer,
 * admin can also hit it manually from the browser.
 */
async function isAuthorised(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${secret}`) return true;
  }
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin";
}

async function handler(req: Request) {
  if (!(await isAuthorised(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { demoted } = await sweepExpiredPlans();
  for (const userId of demoted) {
    await notify({
      userId,
      kind: "plan_activated",
      priority: "high",
      title: "Your Pro plan has expired",
      body: "You're now on Free (2 lifetime applications). Renew Pro for 5/month + AI Coach.",
      link: "/upgrade?to=pro",
    });
    await writeAuditLog({
      actorId: userId,
      actorRole: "student",
      action: "billing.pro.expired",
      targetType: "user",
      targetId: userId,
      summary: `Auto-demoted Pro → Free by daily sweep`,
    });
  }

  // 48-hour warning. Cron runs daily so each user gets at most one warning
  // (the second day they'd already be in the demoted bucket above).
  const warned = await listUsersExpiringSoon(48);
  for (const user of warned) {
    if (user.planRenewalCancelled) continue; // already chose to lapse
    await notify({
      userId: user.id,
      kind: "system",
      priority: "normal",
      title: "Pro plan expiring soon",
      body: `Your Pro plan ends ${user.planExpiresAt ?? "soon"}. Renew now to keep your applications + AI Coach.`,
      link: "/upgrade?to=pro",
    });
  }

  // DPDP § 13 — purge soft-deleted users past their 30-day grace.
  const purged = await sweepHardDeletes();

  logger.info(
    {
      demoted: demoted.length,
      warned: warned.length,
      purged: purged.length,
    },
    "cron.subscription-sweep",
  );

  return NextResponse.json({
    ok: true,
    demoted: demoted.length,
    warned: warned.length,
    purged: purged.length,
  });
}

export const POST = withApiErrorTracking(handler);
export const GET = handler;
