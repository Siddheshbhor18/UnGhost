import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  approveReward,
  RewardTransitionError,
} from "@/server/creator/reward.service";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * POST /api/admin/rewards/:id/approve → pending → approved. Admin-only.
 * An invalid transition (already terminal / not found) returns 409.
 */
async function postHandler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  try {
    const reward = await approveReward(params.id, session.user.id);
    return NextResponse.json({ reward });
  } catch (err) {
    if (err instanceof RewardTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

export const POST = withApiErrorTracking(postHandler);
