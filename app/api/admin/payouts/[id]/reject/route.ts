import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  rejectPayout,
  PayoutTransitionError,
} from "@/server/creator/payout.service";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * POST /api/admin/payouts/:id/reject → requested|approved → rejected.
 * Admin-only. An invalid transition (not found / wrong state) returns 409.
 */
const Input = z.object({
  reason: z.string().trim().min(3).max(500),
});

async function postHandler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;

  try {
    const payout = await rejectPayout(
      params.id,
      session.user.id,
      parsed.data.reason,
    );
    return NextResponse.json({ payout });
  } catch (err) {
    if (err instanceof PayoutTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

export const POST = withApiErrorTracking(postHandler);
