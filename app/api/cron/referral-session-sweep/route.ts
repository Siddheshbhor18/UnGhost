import { NextResponse } from "next/server";
import { expireOldSessions } from "@/server/creator/referral.service";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { requireSameOrigin } from "@/server/lib/csrf";
import { authoriseCron } from "@/server/lib/cron-auth";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

/**
 * Referral-session sweep. Flips active sessions past their `expiresAt` to
 * `expired` (housekeeping only — attribution already keys off `expiresAt`, so
 * this never affects correctness). Runs daily via Vercel Cron.
 *
 * Auth: timing-safe cron bearer OR admin session (same-origin + rate-limited).
 */

export async function POST(req: Request) {
  const auth = await authoriseCron(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!auth.bypassRl) {
    const csrf = requireSameOrigin(req);
    if (csrf) return csrf;
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
