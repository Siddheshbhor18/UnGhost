import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseQuery } from "@/server/lib/validate";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { listRewards } from "@/server/creator/reward.service";

export const runtime = "nodejs";

const Query = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

/**
 * GET /api/creator/rewards?limit= — the logged-in creator's rewards, newest
 * first. Creator-only; scoped to the session user, never a body-supplied id.
 */
async function getHandler(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "creator") {
    return NextResponse.json({ error: "creator_only" }, { status: 403 });
  }
  const parsed = parseQuery(req, Query);
  if (!parsed.ok) return parsed.response;

  const rewards = await listRewards({
    creatorId: session.user.id,
    limit: parsed.data.limit,
  });
  return NextResponse.json({ rewards });
}

export const GET = withApiErrorTracking(getHandler);
