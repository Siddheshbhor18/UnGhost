import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { listPayouts, requestPayout } from "@/server/creator/payout.service";
import { payoutRequestInputSchema } from "@/server/creator/types";

export const runtime = "nodejs";

/**
 * GET  /api/creator/payouts → the logged-in creator's payout requests.
 * POST /api/creator/payouts { amountPaise } → request a withdrawal. The service
 *      gates on verified payment details, the minimum floor, and balance; a
 *      failed gate returns 400 with the reason (+ detail), success → 201.
 *
 * Creator-only; the creator is ALWAYS the session user, never a body id.
 */
async function getHandler() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "creator") {
    return NextResponse.json({ error: "creator_only" }, { status: 403 });
  }
  const payouts = await listPayouts(session.user.id);
  return NextResponse.json({ payouts });
}

async function postHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "creator") {
    return NextResponse.json({ error: "creator_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, payoutRequestInputSchema);
  if (!parsed.ok) return parsed.response;

  const result = await requestPayout(session.user.id, parsed.data.amountPaise);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason, detail: result.detail },
      { status: 400 },
    );
  }
  return NextResponse.json({ payout: result.payout }, { status: 201 });
}

export const GET = withApiErrorTracking(getHandler);
// 20 payout requests / hour / creator — blunts request spam without blocking
// legitimate retries after a failed gate (bad details, below minimum).
export const POST = withRateLimit(
  { bucket: "creator.payout.request", limit: 20, windowSec: 3600, by: "user" },
  withApiErrorTracking(postHandler),
);
