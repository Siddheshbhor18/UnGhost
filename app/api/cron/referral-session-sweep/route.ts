import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { expireOldSessions } from "@/server/creator/referral.service";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

/**
 * Referral-session sweep. Flips active sessions past their `expiresAt` to
 * `expired` (housekeeping only — attribution already keys off `expiresAt`, so
 * this never affects correctness). Runs daily via Vercel Cron.
 *
 * Auth mirrors the other crons:
 *   1. Scheduled — `Authorization: Bearer ${CRON_SECRET}`.
 *   2. Manual admin trigger — authenticated admin session, rate-limited.
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
  return { ok: session?.user?.role === "admin", bypassRl: false };
}

export async function POST(req: Request) {
  const auth = await isAuthorised(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!auth.bypassRl) {
    const rl = await rateLimit("referral-session-sweep.manual", "global", {
      limit: 6,
      windowSec: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl);
  }
  const expired = await expireOldSessions();
  logger.info({ expired }, "referral-session-sweep completed");
  return NextResponse.json({ ok: true, expired });
}

// Also accept GET for easy admin manual trigger from the browser.
export async function GET(req: Request) {
  return POST(req);
}
