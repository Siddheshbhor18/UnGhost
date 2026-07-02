import { NextResponse } from "next/server";
import { expireUnrespondedInMails } from "@/server/store";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { requireSameOrigin } from "@/server/lib/csrf";
import { authoriseCron } from "@/server/lib/cron-auth";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

/**
 * InMail 14-day refund sweep. Finds pending InMails whose `refundDeadline`
 * has passed, flips them to `ignored_refunded`, and credits the recruiter
 * back one InMail. Runs daily via Vercel Cron — deadlines move at day
 * granularity so hourly is overkill.
 *
 * Two trigger modes:
 *   1. Scheduled — `Authorization: Bearer ${CRON_SECRET}` (timing-safe compare).
 *   2. Manual admin trigger — session + same-origin + rate-limit.
 */

export async function POST(req: Request) {
  const auth = await authoriseCron(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!auth.bypassRl) {
    // Admin browser path — mirror every other admin mutation with a same-
    // origin guard so a CSRF-shaped request from an attacker page can't
    // trigger a mass credit-refund via a logged-in admin's session.
    const csrf = requireSameOrigin(req);
    if (csrf) return csrf;
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
