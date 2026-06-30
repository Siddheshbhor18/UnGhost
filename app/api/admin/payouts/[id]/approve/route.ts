import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  approvePayout,
  PayoutTransitionError,
} from "@/server/creator/payout.service";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * POST /api/admin/payouts/:id/approve → requested → approved. Admin-only.
 * An invalid transition (not found / wrong state) returns 409.
 */
async function postHandler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  try {
    const payout = await approvePayout(params.id, session.user.id);
    return NextResponse.json({ payout });
  } catch (err) {
    if (err instanceof PayoutTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

export const POST = withApiErrorTracking(postHandler);
