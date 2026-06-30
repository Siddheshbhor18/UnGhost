import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { setCommissionAgreement } from "@/server/creator/commission.service";
import { commissionInputSchema } from "@/server/creator/types";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * POST /api/admin/creators/:id/commission
 *
 * Set (or change) a creator's commission. Supersedes the current active
 * agreement and inserts a new active one. Admin-only.
 */
const Input = commissionInputSchema.and(
  z.object({ notes: z.string().max(2000).optional() }),
);

async function postHandler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const agreement = await setCommissionAgreement(
    params.id,
    data,
    session.user.id,
    data.notes,
  );
  return NextResponse.json({ agreement });
}

export const POST = withApiErrorTracking(postHandler);
