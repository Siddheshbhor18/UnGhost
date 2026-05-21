import { NextResponse } from "next/server";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import {
  getPartnerStats,
  listPartnerReferrals,
  verifyPartnerToken,
} from "@/server/store";

export const runtime = "nodejs";

interface Ctx {
  params: { code: string };
}

/**
 * GET /api/partners/[code]/stats?key=<token>
 *
 * Public read for the partner-portal dashboard at /p/[code]. Token is
 * bearer auth — code + token must both match a row in the partners table
 * AND the partner must be active. Returns 404 on every failure mode so
 * the route doesn't confirm what's valid to anyone probing.
 *
 * IP-rate-limited generously (60/min) so partners can keep the dashboard
 * open + polling without tripping anything.
 */
async function handler(req: Request, { params }: Ctx) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? "";

  const partner = await verifyPartnerToken(params.code, key);
  if (!partner) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const [stats, referrals] = await Promise.all([
    getPartnerStats(partner.id),
    listPartnerReferrals(partner.id, 50),
  ]);

  return NextResponse.json({
    partner: {
      id: partner.id,
      code: partner.code,
      name: partner.name,
      commissionPct: partner.commissionPct,
    },
    stats,
    referrals,
  });
}

export const GET = withRateLimit(
  { bucket: "partner.stats", limit: 60, windowSec: 60, by: "ip" },
  withApiErrorTracking(handler),
);
