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
import { LiveSessionModel, UserModel } from "@/server/db/models";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

// Minimal shape of the fields we `.select()` from LiveSession. Mongoose's
// `.lean()` returns FlattenMaps which loses our domain-type refinements;
// naming the shape here lets us skip an `as any` at every field read.
interface LiveSessionForPlayback {
  streamProvider?: string;
  tier?: string;
  bootcampId?: string;
}

interface UserProfileEnrolments {
  profile?: { enrolledBootcamps?: string[] };
}

async function handler(req: Request, { params }: Ctx): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  await connectMongo();
  const live = (await LiveSessionModel.findById(params.id)
    .select("streamProvider tier bootcampId")
    .lean()) as LiveSessionForPlayback | null;

  if (!live) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (live.streamProvider !== "cloudflare") {
    return NextResponse.json(
      { error: "not_cloudflare_session" },
      { status: 400 },
    );
  }

  // Paid sessions: check *bootcamp enrollment*, not the live session's
  // `registeredStudentIds`. `registerForLiveSession` is open to any
  // logged-in user (no enrollment gate) — using it here let any student
  // register for a paid session, receive a Cloudflare Stream token, and
  // watch content they never paid for. Mirror `video-token/route.ts`.
  if (
    live.tier === "paid" &&
    session.user.role === "student" &&
    live.bootcampId
  ) {
    const user = (await UserModel.findById(session.user.id)
      .select("profile.enrolledBootcamps")
      .lean()) as UserProfileEnrolments | null;
    const enrolled = user?.profile?.enrolledBootcamps ?? [];
    if (!enrolled.includes(live.bootcampId)) {
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
  withApiErrorTracking(handler),
);
