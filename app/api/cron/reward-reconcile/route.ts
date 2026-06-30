import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { reconcileMissingRewards } from "@/server/creator/reward.service";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

/**
 * Reward reconciliation backstop (§10.2 N6). Re-creates any creator reward that
 * the best-effort fulfilment hook missed. Idempotent — safe to re-run. Daily
 * via Vercel Cron. Auth mirrors the other crons (CRON_SECRET or admin session).
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
