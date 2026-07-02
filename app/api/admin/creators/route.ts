import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody, parseQuery } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import {
  createCreator,
  listCreators,
  searchCreators,
} from "@/server/creator/creator.service";
import { createCreatorInputSchema } from "@/server/creator/types";

export const runtime = "nodejs";

/**
 * GET  /api/admin/creators        → list (?status=) or search (?q=) creators.
 * POST /api/admin/creators        → onboard a new creator. Returns the profile,
 *                                    its first commission agreement, and the
 *                                    shareable referral URL.
 * Both routes are admin-only.
 */
const ListQuery = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["pending", "active", "suspended", "terminated"]).optional(),
});

async function getHandler(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const parsed = parseQuery(req, ListQuery);
  if (!parsed.ok) return parsed.response;
  const { q, status } = parsed.data;
  const creators = q
    ? await searchCreators(q)
    : await listCreators({ status });
  return NextResponse.json({ creators });
}

async function postHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admin_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, createCreatorInputSchema);
  if (!parsed.ok) return parsed.response;

  const result = await createCreator(parsed.data, session.user.id);
  if (!result.ok) {
    // `weak_password` is admin-input validation, not a duplicate-key state, so
    // it maps to 400 with the policy detail; the two dedupe reasons keep 409.
    if (result.reason === "weak_password") {
      return NextResponse.json(
        { error: "weak_password", detail: result.detail },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }
  const { profile, agreement } = result;
  const referralUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/r/${profile.referralCode}`;
  return NextResponse.json(
    { profile, agreement, referralUrl },
    { status: 201 },
  );
}

export const GET = withApiErrorTracking(getHandler);
export const POST = withRateLimit(
  { bucket: "admin.creator.create", limit: 60, windowSec: 3600, by: "user" },
  withApiErrorTracking(postHandler),
);
