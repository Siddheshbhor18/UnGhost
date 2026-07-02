import { NextResponse } from "next/server";
import { reconcileMissingRewards } from "@/server/creator/reward.service";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { requireSameOrigin } from "@/server/lib/csrf";
import { authoriseCron } from "@/server/lib/cron-auth";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

/**
 * Reward reconciliation backstop (§10.2 N6). Re-creates any creator reward
 * that the best-effort fulfilment hook missed. Idempotent — safe to re-run.
 * Daily via Vercel Cron. Auth: timing-safe cron bearer OR admin session.
 */

export async function POST(req: Request) {
  const auth = await authoriseCron(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!auth.bypassRl) {
    const csrf = requireSameOrigin(req);
    if (csrf) return csrf;
    const rl = await rateLimit("reward-reconcile.manual", "global", {
      limit: 6,
      windowSec: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl);
  }
  const result = await reconcileMissingRewards();
  logger.info(result, "reward-reconcile completed");
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return POST(req);
}
