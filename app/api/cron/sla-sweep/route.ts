import { NextResponse } from "next/server";
import { runSlaSweep } from "@/server/store";
import { rateLimit, rateLimitResponse } from "@/server/lib/rate-limit";
import { requireSameOrigin } from "@/server/lib/csrf";
import { authoriseCron } from "@/server/lib/cron-auth";

export const runtime = "nodejs";

/**
 * SLA breach sweep. Scans active applications, flips expired SLAs to
 * "rejected · breached", refunds the application credit, fires notifications
 * to both student and recruiter, and fires T-12h / T-4h warnings.
 *
 * Two trigger modes:
 *   1. Scheduled — `Authorization: Bearer ${CRON_SECRET}` (timing-safe compare).
 *      Configure in vercel.json `crons` (every 5 min recommended).
 *   2. Manual admin trigger — session + same-origin + rate-limit.
 */

export async function POST(req: Request) {
  const auth = await authoriseCron(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!auth.bypassRl) {
    // Session (admin-button) path is browser-originated, so it needs the same
    // same-origin guard as every other admin mutation — this sweep issues
    // refund credits + mass-mutates applications. The cron-secret path is
    // server-to-server (no cookies) and is correctly exempt.
    const csrf = requireSameOrigin(req);
    if (csrf) return csrf;
    const rl = await rateLimit("sla-sweep.manual", "global", {
      limit: 6,
      windowSec: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl);
  }
  const result = await runSlaSweep();
  return NextResponse.json({ ok: true, ...result });
}
