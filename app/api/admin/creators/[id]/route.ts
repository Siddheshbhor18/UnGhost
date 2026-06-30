import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  getCreatorById,
  suspendCreator,
  terminateCreator,
  reactivateCreator,
  updateCreatorProfile,
  verifyCreatorPaymentDetails,
  countReferrals,
  CreatorTransitionError,
} from "@/server/creator/creator.service";
import {
  getActiveAgreement,
  listAgreementHistory,
} from "@/server/creator/commission.service";
import { getBalance } from "@/server/creator/ledger.service";
import { socialLinksSchema, type CreatorProfile } from "@/server/creator/types";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

/**
 * GET   → full creator detail: profile, active agreement + history, derived
 *         balance, and lifetime referral count.
 * PATCH → admin lifecycle / profile actions. Invalid state transitions return
 *         409; an unknown creator returns 404.
 * Both routes are admin-only.
 */
async function getHandler(_req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const profile = await getCreatorById(params.id);
  if (!profile) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const [activeAgreement, agreementHistory, balancePaise, referrals] =
    await Promise.all([
      getActiveAgreement(params.id),
      listAgreementHistory(params.id),
      getBalance(params.id),
      countReferrals(params.id),
    ]);
  return NextResponse.json({
    profile,
    activeAgreement,
    agreementHistory,
    balancePaise,
    referrals,
  });
}

const PatchInput = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suspend"),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({
    action: z.literal("terminate"),
    reason: z.string().trim().min(3).max(500),
  }),
  z.object({ action: z.literal("reactivate") }),
  z.object({
    action: z.literal("updateProfile"),
    socialLinks: socialLinksSchema.optional(),
    bio: z.string().max(2000).optional(),
  }),
  z.object({ action: z.literal("verifyPayment") }),
]);

async function patchHandler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, PatchInput);
  if (!parsed.ok) return parsed.response;
  const input = parsed.data;
  const adminId = session.user.id;

  try {
    let profile: CreatorProfile | undefined;
    switch (input.action) {
      case "suspend":
        profile = await suspendCreator(params.id, input.reason, adminId);
        break;
      case "terminate":
        profile = await terminateCreator(params.id, input.reason, adminId);
        break;
      case "reactivate":
        profile = await reactivateCreator(params.id, adminId);
        break;
      case "updateProfile":
        profile = await updateCreatorProfile(params.id, {
          socialLinks: input.socialLinks,
          bio: input.bio,
        });
        break;
      case "verifyPayment":
        profile = await verifyCreatorPaymentDetails(params.id, adminId);
        break;
    }
    if (!profile) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof CreatorTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}

export const GET = withApiErrorTracking(getHandler);
export const PATCH = withApiErrorTracking(patchHandler);
