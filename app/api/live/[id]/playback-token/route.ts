/**
 * GET /api/live/[id]/playback-token
 *
 * Returns a short-lived signed playback token for Cloudflare Stream
 * sessions. The client CloudflarePlayer component calls this on mount
 * and every ~50 min to refresh before the 1-hour token expires.
 *
 * Access rules:
 *   - Must be authenticated
 *   - For paid sessions: must be enrolled in the linked bootcamp
 *   - Only returns tokens for streamProvider === "cloudflare" sessions
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { generateStreamPlaybackToken } from "@/server/store";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { connectMongo } from "@/server/db/mongo";
import { LiveSessionModel } from "@/server/db/models";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

async function handler(req: Request, { params }: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  await connectMongo();
  const live = await LiveSessionModel.findById(params.id)
    .select("streamProvider tier bootcampId registeredStudentIds")
    .lean();

  if (!live) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if ((live as any).streamProvider !== "cloudflare") {
    return NextResponse.json(
      { error: "not_cloudflare_session" },
      { status: 400 },
    );
  }

  // Paid sessions: verify enrollment (admin/instructor bypass)
  if (
    (live as any).tier === "paid" &&
    session.user.role === "student" &&
    live.bootcampId
  ) {
    const enrolled = (live.registeredStudentIds ?? []).includes(
      session.user.id,
    );
    if (!enrolled) {
      return NextResponse.json(
        { error: "not_enrolled" },
        { status: 403 },
      );
    }
  }

  const result = await generateStreamPlaybackToken(params.id);
  if (!result) {
    return NextResponse.json(
      { error: "stream_not_provisioned" },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}

export const GET = withRateLimit(
  { bucket: "live.playback-token", limit: 12, windowSec: 300, by: "user" },
  withApiErrorTracking(handler as any),
);
