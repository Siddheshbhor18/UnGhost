import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  getCreatorById,
  countReferrals,
} from "@/server/creator/creator.service";
import { getActiveAgreement } from "@/server/creator/commission.service";
import { listRewards } from "@/server/creator/reward.service";
import { getBalance } from "@/server/creator/ledger.service";

export const runtime = "nodejs";

/**
 * GET /api/creator/dashboard — the logged-in creator's home snapshot: derived
 * balance, lifetime referral count, profile, active commission, the 10 most
 * recent rewards, and lifetime/pending earning totals.
 *
 * Creator-only. The creator is ALWAYS the session user — never a body-supplied
 * id — so a creator can only ever see their own numbers.
 */
async function getHandler() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "creator") {
    return NextResponse.json({ error: "creator_only" }, { status: 403 });
  }
  const cid = session.user.id;

  const [
    balancePaise,
    referrals,
    profile,
    activeAgreement,
    recentRewards,
    allRewards,
  ] = await Promise.all([
    getBalance(cid),
    countReferrals(cid),
    getCreatorById(cid),
    getActiveAgreement(cid),
    listRewards({ creatorId: cid, limit: 10 }),
    listRewards({ creatorId: cid }),
  ]);

  // Presentation aggregation over the full reward list (allowed in-handler):
  // lifetime = realized earnings (approved); pending = still-in-flight earnings
  // — approved (already realized) and reversed (clawed back) don't count.
  let lifetimePaise = 0;
  let pendingPaise = 0;
  for (const reward of allRewards) {
    if (reward.status === "approved") lifetimePaise += reward.calculatedAmount;
    if (reward.status !== "approved" && reward.status !== "reversed") {
      pendingPaise += reward.calculatedAmount;
    }
  }

  return NextResponse.json({
    balancePaise,
    referrals,
    profile,
    activeAgreement,
    recentRewards,
    totals: { lifetimePaise, pendingPaise },
  });
}

export const GET = withApiErrorTracking(getHandler);
