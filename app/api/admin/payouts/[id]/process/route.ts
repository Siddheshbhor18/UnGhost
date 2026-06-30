import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  processPayout,
  PayoutTransitionError,
} from "@/server/creator/payout.service";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * POST /api/admin/payouts/:id/process → approved → paid, writing the ledger
 * debit. Admin-only. An invalid transition (not found / wrong state) returns
 * 409.
 */
const Input = z.object({
  paymentReference: z.string().trim().min(1).max(200),
  tdsPaise: z.number().int().nonnegative().max(50_000_000).optional(),
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
    const payout = await processPayout(params.id, session.user.id, {
      paymentReference: parsed.data.paymentReference,
      tdsPaise: parsed.data.tdsPaise,
    });
    return NextResponse.json({ payout });
  } catch (err) {
    if (err instanceof PayoutTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

export const POST = withApiErrorTracking(postHandler);
