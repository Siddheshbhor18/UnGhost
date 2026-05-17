import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { runSlaSweep } from "@/server/store";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";

export const runtime = "nodejs";

/**
 * SLA breach sweep. Scans active applications, flips expired SLAs to
 * "rejected · breached", refunds the application credit, fires notifications
 * to both student and recruiter, and fires T-12h / T-4h warnings.
 *
 * Two trigger modes:
 *   1. Scheduled (Vercel Cron / external scheduler):
 *        Header `Authorization: Bearer ${CRON_SECRET}` required.
 *        Configure in vercel.json `crons` (every 5 min recommended).
 *   2. Manual admin trigger:
 *        Authenticated admin session — used by the Admin Today button.
 */
async function isAuthorised(
  req: Request,
): Promise<{ ok: boolean; bypassRl: boolean }> {
  // Vercel cron via secret bearer — bypass rate-limit (scheduled trigger).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth === `Bearer ${secret}`) return { ok: true, bypassRl: true };
  }
  // Otherwise require admin session — apply rate-limit so a panicked click
  // can't fan out into N+1 queries against the application table.
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
    const rl = await rateLimit("sla-sweep.manual", "global", {
      limit: 6,
      windowSec: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl);
  }
  const result = await runSlaSweep();
  return NextResponse.json({ ok: true, ...result });
}

// Also accept GET for easy admin manual trigger from the browser.
export async function GET(req: Request) {
  return POST(req);
}
