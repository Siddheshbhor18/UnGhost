/**
 * GET /api/live/[id]/video-token
 *
 * Returns the YouTube video ID for a live session ONLY after verifying:
 *   1. User is authenticated
 *   2. Session exists and has a video ID
 *   3. For paid sessions: user is enrolled in the parent bootcamp
 *   4. Rate limit: 10 requests per 5 minutes per user
 *
 * Every successful fetch is audit-logged (userId, sessionId, IP, timestamp)
 * so leaked content can be traced back to the exact student.
 *
 * The video ID is NEVER included in server-rendered HTML — it only travels
 * through this authenticated API call at runtime.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { connectMongo } from "@/server/db/mongo";
import { LiveSessionModel, UserModel, AuditLogModel } from "@/server/db/models";
import {
  rateLimit,
  rateLimitResponse,
  identifierFromRequest,
} from "@/server/lib/rate-limit";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

export async function GET(req: Request, { params }: Ctx) {
  // ── Auth ──────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // ── Rate limit ────────────────────────────────────────────────────
  const rl = await rateLimit(
    "video-token",
    identifierFromRequest(req, session.user.id),
    { limit: 10, windowSec: 300 },
  );
  if (!rl.allowed) return rateLimitResponse(rl);

  // ── Load session ──────────────────────────────────────────────────
  await connectMongo();
  const live = await LiveSessionModel.findById(params.id).lean();
  if (!live) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // ── Check video ID exists ─────────────────────────────────────────
  const videoId = live.youtubeVideoId;
  if (!videoId) {
    return NextResponse.json(
      { error: "no_stream", reason: "Stream not started yet" },
      { status: 404 },
    );
  }

  // ── Enrollment gate for paid sessions ─────────────────────────────
  if (live.tier === "paid" && live.bootcampId) {
    // Admin + instructor bypass enrollment check
    const isPrivileged =
      session.user.role === "admin" ||
      session.user.role === "instructor";

    if (!isPrivileged) {
      const user = await UserModel.findById(session.user.id)
        .select("profile.enrolledBootcamps")
        .lean();

      const enrolled =
        (user as any)?.profile?.enrolledBootcamps ?? [];
      const isEnrolled = enrolled.includes(live.bootcampId);

      if (!isEnrolled) {
        return NextResponse.json(
          {
            error: "forbidden",
            reason:
              "You must be enrolled in this bootcamp to watch paid sessions",
          },
          { status: 403 },
        );
      }
    }
  }

  // ── Audit log ─────────────────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  // Fire-and-forget — don't block response on audit write
  void AuditLogModel.create({
    _id: crypto.randomUUID(),
    actorId: session.user.id,
    actorRole: session.user.role ?? "student",
    action: "video_token_fetch",
    targetType: "live_session",
    targetId: params.id,
    summary: `Video ID fetched for session "${live.title}"`,
    meta: {
      ip,
      userAgent: req.headers.get("user-agent")?.slice(0, 200),
      tier: live.tier ?? "free",
      bootcampId: live.bootcampId ?? null,
    },
    createdAt: new Date().toISOString(),
  }).catch(() => {
    /* audit failure must not break playback */
  });

  // ── Return video ID ───────────────────────────────────────────────
  return NextResponse.json(
    { videoId },
    {
      headers: {
        // Don't cache — every fetch must be auth-checked + logged
        "cache-control": "no-store, no-cache, must-revalidate",
        "x-ratelimit-limit": String(rl.limit),
        "x-ratelimit-remaining": String(rl.remaining),
      },
    },
  );
}
