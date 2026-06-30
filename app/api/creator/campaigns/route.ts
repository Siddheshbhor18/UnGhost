import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { getCreatorById } from "@/server/creator/creator.service";
import { connectMongo } from "@/server/db/mongo";
import { ReferralSessionModel } from "@/server/db/creator-models";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * GET  /api/creator/campaigns → the creator's referral code + base referral URL
 *      and the distinct campaign names seen on their referral sessions. A
 *      "campaign" is just a named link (`?campaign=`), not a stored collection.
 * POST /api/creator/campaigns { name } → a shareable campaign link for `name`.
 *
 * Creator-only; the creator is ALWAYS the session user, never a body id.
 */
async function getHandler() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "creator") {
    return NextResponse.json({ error: "creator_only" }, { status: 403 });
  }
  const cid = session.user.id;
  const profile = await getCreatorById(cid);
  if (!profile) {
    return NextResponse.json({ error: "creator_not_found" }, { status: 404 });
  }

  await connectMongo();
  const distinct = await ReferralSessionModel.distinct("campaign", {
    creatorId: cid,
  });
  const campaigns = distinct.filter(
    (c): c is string => typeof c === "string" && c.length > 0,
  );

  return NextResponse.json({
    referralCode: profile.referralCode,
    referralUrl: `${APP_URL}/r/${profile.referralCode}`,
    campaigns,
  });
}

const PostInput = z
  .object({
    name: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]+$/i, "Campaign name must be letters, digits, hyphens")
      .min(1)
      .max(40),
  })
  .strict();

async function postHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "creator") {
    return NextResponse.json({ error: "creator_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, PostInput);
  if (!parsed.ok) return parsed.response;

  const profile = await getCreatorById(session.user.id);
  if (!profile) {
    return NextResponse.json({ error: "creator_not_found" }, { status: 404 });
  }
  const url = `${APP_URL}/r/${profile.referralCode}?campaign=${encodeURIComponent(
    parsed.data.name,
  )}`;
  return NextResponse.json({ url });
}

export const GET = withApiErrorTracking(getHandler);
export const POST = withApiErrorTracking(postHandler);
