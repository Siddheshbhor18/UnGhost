import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseQuery } from "@/server/lib/validate";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { listRewards } from "@/server/creator/reward.service";

export const runtime = "nodejs";

/**
 * GET /api/admin/rewards?status= → the rewards queue, newest first. Admin-only.
 */
const ListQuery = z.object({
  status: z.enum(["pending", "approved", "rejected", "reversed"]).optional(),
});

async function getHandler(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const parsed = parseQuery(req, ListQuery);
  if (!parsed.ok) return parsed.response;
  const rewards = await listRewards({ status: parsed.data.status });
  return NextResponse.json({ rewards });
}

export const GET = withApiErrorTracking(getHandler);
