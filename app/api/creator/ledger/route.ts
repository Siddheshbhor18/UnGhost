import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { getLedgerHistory, getBalance } from "@/server/creator/ledger.service";

export const runtime = "nodejs";

/**
 * GET /api/creator/ledger — the logged-in creator's credit-ledger history plus
 * their derived balance (paise; may be negative after a post-payout reversal).
 * Creator-only; scoped to the session user, never a body-supplied id.
 */
async function getHandler() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "creator") {
    return NextResponse.json({ error: "creator_only" }, { status: 403 });
  }
  const cid = session.user.id;

  const [entries, balancePaise] = await Promise.all([
    getLedgerHistory(cid),
    getBalance(cid),
  ]);
  return NextResponse.json({ entries, balancePaise });
}

export const GET = withApiErrorTracking(getHandler);
