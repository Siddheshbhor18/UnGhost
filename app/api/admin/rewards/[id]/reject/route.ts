import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { rejectReward } from "@/server/creator/reward.service";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * POST /api/admin/rewards/:id/reject → pending → rejected, writing the
 * offsetting ledger entry. Returns the ReverseResult. Admin-only.
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

  const result = await rejectReward(params.id, session.user.id, parsed.data.reason);
  return NextResponse.json(result);
}

export const POST = withApiErrorTracking(postHandler);
