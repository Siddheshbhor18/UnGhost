import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { updateCreatorPaymentDetails } from "@/server/creator/creator.service";
import { paymentDetailsInputSchema } from "@/server/creator/types";

export const runtime = "nodejs";

/**
 * PATCH /api/creator/payment-details — the logged-in creator sets/updates their
 * own bank/UPI payout destination. Any change resets `verified` to false (the
 * service enforces this), so an admin must re-verify before the next payout.
 *
 * Creator-only; the creator is ALWAYS the session user, never a body id.
 */
async function patchHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "creator") {
    return NextResponse.json({ error: "creator_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, paymentDetailsInputSchema);
  if (!parsed.ok) return parsed.response;

  const profile = await updateCreatorPaymentDetails(
    session.user.id,
    parsed.data,
  );
  return NextResponse.json({ profile });
}

export const PATCH = withApiErrorTracking(patchHandler);
