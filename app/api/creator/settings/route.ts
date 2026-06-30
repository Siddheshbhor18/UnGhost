import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  getCreatorById,
  updateCreatorProfile,
} from "@/server/creator/creator.service";
import { socialLinksSchema } from "@/server/creator/types";

export const runtime = "nodejs";

/**
 * GET   /api/creator/settings → the logged-in creator's profile.
 * PATCH /api/creator/settings → edit own social links / bio.
 *
 * Creator-only; the creator is ALWAYS the session user, never a body id.
 */
async function getHandler() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "creator") {
    return NextResponse.json({ error: "creator_only" }, { status: 403 });
  }
  const profile = await getCreatorById(session.user.id);
  return NextResponse.json({ profile });
}

const PatchInput = z
  .object({
    socialLinks: socialLinksSchema.optional(),
    bio: z.string().max(2000).optional(),
  })
  .strict();

async function patchHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "creator") {
    return NextResponse.json({ error: "creator_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, PatchInput);
  if (!parsed.ok) return parsed.response;

  const profile = await updateCreatorProfile(session.user.id, parsed.data);
  return NextResponse.json({ profile });
}

export const GET = withApiErrorTracking(getHandler);
export const PATCH = withApiErrorTracking(patchHandler);
