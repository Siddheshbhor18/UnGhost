/**
 * Live-session chat — list (GET) + send (POST).
 *
 * URL: /api/live/[code]/chat
 *   • [code] = LiveSession.roomCode (short slug in the public URL)
 *
 * GET ?since=<msgId>&limit=100
 *   Returns latest messages newer than the cursor. Polling client hits this
 *   every ~2s while focused. No auth gate on read — anyone who can SEE the
 *   session page can read the chat (auth gate is on the page itself).
 *
 *   Pagination is cursor-based on createdAt+_id so a client mid-poll never
 *   misses a message even with concurrent writes. Limit clamped to 200.
 *
 * POST { body: string }
 *   Auth required (any logged-in user). 1000 char body cap. Rate-limited
 *   per IP (10/min) AND per user (20/min) to stop flood attacks.
 *   First post by a user also registers them as an attendee — that's our
 *   lead-capture event.
 *
 * Failures are 4xx with `{ error }` shapes; 5xx is reserved for genuinely
 * broken state. The polling client treats 5xx as transient + retries.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { connectMongo } from "@/server/db/mongo";
import {
  LiveSessionAttendeeModel,
  LiveSessionMessageModel,
  LiveSessionModel,
} from "@/server/db/models";
import { clientIp, enforceRateLimit } from "@/server/lib/ratelimit";
import { logger } from "@/server/lib/logger";

const postSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Message can't be empty")
    .max(1000, "Message too long (1000 chars max)"),
});

/**
 * Fetch latest N messages after an optional `since` cursor.
 *
 * Requires a logged-in user. Prior implementation left this open with a
 * comment saying "the page enforces auth" — but the API is directly
 * reachable, so anyone with a public room code could scrape every message
 * body + attendee display name (real PII: some students paste emails /
 * phone numbers into chat). Same enrollment gate the POST route uses now
 * applies here for paid sessions so only enrolled students can read the
 * transcript.
 */
export async function GET(
  request: Request,
  { params }: { params: { code: string } },
): Promise<NextResponse> {
  const authSession = await getServerSession(authOptions);
  if (!authSession?.user?.id) {
    return NextResponse.json(
      { error: "Sign in to view chat" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const since = url.searchParams.get("since");
  const limitParam = Number(url.searchParams.get("limit") ?? "100");
  const limit = Math.min(Math.max(1, limitParam || 100), 200);

  await connectMongo();
  const liveSession = await LiveSessionModel.findOne({
    roomCode: params.code,
  })
    .select("_id tier bootcampId")
    .lean();
  if (!liveSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Paid sessions: only enrolled students (and instructors/admins) can read.
  if (liveSession.tier === "paid" && liveSession.bootcampId) {
    const role = authSession.user.role;
    const isPrivileged = role === "instructor" || role === "admin";
    if (!isPrivileged) {
      const { BootcampModel } = await import("@/server/db/models");
      const bc = await BootcampModel.findById(liveSession.bootcampId)
        .select("enrolledStudentIds")
        .lean();
      if (!bc?.enrolledStudentIds?.includes(authSession.user.id)) {
        return NextResponse.json(
          { error: "You're not enrolled in this bootcamp." },
          { status: 403 },
        );
      }
    }
  }

  const query: Record<string, unknown> = {
    sessionId: String(liveSession._id),
    deletedAt: null,
  };
  // `since` is a message _id. We fetch the cursor's createdAt then ask for
  // anything strictly newer. Falling back to id-greater-than would break
  // with non-monotonic UUIDs.
  if (since) {
    const cursor = await LiveSessionMessageModel.findById(since)
      .select("createdAt")
      .lean();
    if (cursor?.createdAt) {
      query.createdAt = { $gt: cursor.createdAt };
    }
  }

  const messages = await LiveSessionMessageModel.find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: String(m._id),
      userId: m.userId,
      userName: m.userName,
      body: m.body,
      createdAt:
        m.createdAt instanceof Date
          ? m.createdAt.toISOString()
          : String(m.createdAt),
    })),
  });
}

/** Post a message + register attendee (first time). */
export async function POST(
  request: Request,
  { params }: { params: { code: string } },
): Promise<NextResponse> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Sign in to chat" },
      { status: 401 },
    );
  }

  // Two-layer rate limit — per IP (catches single-machine floods) AND per
  // user (catches a user opening multiple tabs). Either trips → 429.
  const ip = clientIp(request);
  const [ipLimit, userLimit] = await Promise.all([
    enforceRateLimit({ key: `chat:ip:${ip}`, max: 30, windowSec: 60 }),
    enforceRateLimit({
      key: `chat:user:${session.user.id}`,
      max: 20,
      windowSec: 60,
    }),
  ]);
  if (!ipLimit.ok || !userLimit.ok) {
    const limit = !ipLimit.ok ? ipLimit : userLimit;
    return NextResponse.json(
      { error: "Slow down — too many messages" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.resetInSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  await connectMongo();
  const liveSession = await LiveSessionModel.findOne({
    roomCode: params.code,
  })
    .select("_id status tier bootcampId")
    .lean();
  if (!liveSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  // Block chat after session ends — recording viewers shouldn't pollute
  // the historical chat record. (For "watch with friends" reactions later,
  // open this up.)
  if (liveSession.status === "ended" || liveSession.status === "cancelled") {
    return NextResponse.json(
      { error: "This session has ended — chat is closed." },
      { status: 410 },
    );
  }
  // Paid sessions enforce bootcamp enrollment. Free sessions are open to
  // any logged-in user — that's the lead-capture path.
  if (liveSession.tier === "paid" && liveSession.bootcampId) {
    const enrolled = String(session.user.id);
    // Roster check uses Bootcamp.enrolledStudentIds — populated by the
    // payment approval flow in Phase 3.
    const { BootcampModel } = await import("@/server/db/models");
    const bc = await BootcampModel.findById(liveSession.bootcampId)
      .select("enrolledStudentIds")
      .lean();
    if (!bc?.enrolledStudentIds?.includes(enrolled)) {
      return NextResponse.json(
        { error: "You're not enrolled in this bootcamp." },
        { status: 403 },
      );
    }
  }

  const msgId = `msg_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  await LiveSessionMessageModel.create({
    _id: msgId,
    sessionId: String(liveSession._id),
    userId: session.user.id,
    userName: session.user.name ?? "Anonymous",
    body: parsed.data.body,
  });

  // Lead capture — first message from this user in this session writes an
  // attendee row. The composite _id prevents duplicates on subsequent posts.
  // Fire-and-forget — message is already committed.
  LiveSessionAttendeeModel.updateOne(
    { _id: `${liveSession._id}:${session.user.id}` },
    {
      $setOnInsert: {
        _id: `${liveSession._id}:${session.user.id}`,
        sessionId: String(liveSession._id),
        userId: session.user.id,
        joinedAt: new Date(),
      },
    },
    { upsert: true },
  ).catch((err: unknown) =>
    logger.error({ err, sessionId: liveSession._id }, "chat.attendee_failed"),
  );

  return NextResponse.json({ id: msgId }, { status: 201 });
}
