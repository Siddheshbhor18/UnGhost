import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { expireUnrespondedInMails } from "@/server/store";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

/**
 * InMail 14-day refund sweep. Finds pending InMails whose `refundDeadline`
 * has passed, flips them to `ignored_refunded`, and credits the recruiter
 * back one InMail. Runs daily via Vercel Cron — deadlines move at day
 * granularity so hourly is overkill.
 *
 * Two trigger modes (mirrors sla-sweep):
 *   1. Scheduled — `Authorization: Bearer ${CRON_SECRET}` header.
 *   2. Manual admin trigger — authenticated admin session, rate-limited so
 *      a panicked click can't fan out.
 */
async function isAuthorised(
  req: Request,
): Promise<{ ok: boolean; bypassRl: boolean }> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${secret}`) return { ok: true, bypassRl: true };
  }
  const session = await getServerSession(authOptions);
  return {
    ok: session?.user?.role === "admin",
    bypassRl: false,
  };
}

export async function POST(req: Request) {
  const auth = await isAuthorised(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!auth.bypassRl) {
    const rl = await rateLimit("inmail-refund-sweep.manual", "global", {
      limit: 6,
      windowSec: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl);
  }
  const result = await expireUnrespondedInMails();
  logger.info(
    { refunded: result.refunded },
    "inmail-refund-sweep completed",
  );
  return NextResponse.json({ ok: true, refunded: result.refunded });
}

// Also accept GET for easy admin manual trigger from the browser.
export async function GET(req: Request) {
  return POST(req);
}
