/**
 * POST /api/admin/live-sessions
 *
 * Create a new free live session. Admin-only.
 *
 * Generates a short roomCode (URL-safe, 6 chars) that becomes the public
 * /live/[code] slug. Retries on collision via the unique index.
 *
 * The session starts in 'scheduled' state with no `youtubeVideoId`. Admin
 * pastes the YouTube video ID later (when the instructor goes live) via
 * PATCH on /api/admin/live-sessions/[id].
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { randomBytes, randomUUID } from "crypto";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { connectMongo } from "@/server/db/mongo";
import { LiveSessionModel } from "@/server/db/models";
import { logger } from "@/server/lib/logger";
import { streamMode } from "@/server/integrations/stream";
import { provisionCloudflareStream } from "@/server/store";

const inputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(500).optional(),
  startsAt: z.string().min(1, "Start time required"),
  durationMin: z.number().int().min(15).max(360).default(60),
  tier: z.enum(["free", "paid"]).default("free"),
  bootcampId: z.string().optional(),
  youtubeVideoId: z.string().trim().optional(),
  streamProvider: z.enum(["youtube", "cloudflare"]).optional(),
});

function generateRoomCode(): string {
  // URL-safe slug — 8 chars from base36. ~2.8 trillion combinations,
  // collision risk negligible for our scale; unique index catches edge.
  return randomBytes(6)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, 8)
    .toLowerCase();
}

export async function POST(request: Request): Promise<NextResponse> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // Auto-default: paid + CF credentials available → cloudflare, else youtube
  const provider =
    parsed.data.streamProvider ??
    (parsed.data.tier === "paid" && streamMode() === "cloudflare"
      ? "cloudflare"
      : "youtube");

  await connectMongo();
  const id = `ls_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

  // Retry on roomCode collision (unique index). Cap at 5 tries.
  let roomCode = generateRoomCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await LiveSessionModel.create({
        _id: id,
        roomCode,
        title: parsed.data.title,
        description: parsed.data.description,
        startsAt: parsed.data.startsAt,
        durationMin: parsed.data.durationMin,
        tier: parsed.data.tier,
        bootcampId: parsed.data.bootcampId ?? null,
        youtubeVideoId: parsed.data.youtubeVideoId || null,
        streamProvider: provider,
        instructorId: session.user.id,
        status: "scheduled",
        registeredStudentIds: [],
        attendedStudentIds: [],
        createdAt: new Date().toISOString(),
      });

      // Auto-provision Cloudflare Stream Live Input
      let cfData: { cfRtmpUrl: string; cfStreamKey: string } | undefined;
      if (provider === "cloudflare") {
        try {
          cfData = await provisionCloudflareStream(id);
        } catch (err) {
          logger.error({ err, sessionId: id }, "cf_stream.provision_failed");
        }
      }

      logger.info(
        { sessionId: id, roomCode, provider, adminUserId: session.user.id },
        "live_session.created",
      );
      return NextResponse.json(
        {
          id,
          roomCode,
          url: `/live/${roomCode}`,
          streamProvider: provider,
          ...(cfData ? { cfRtmpUrl: cfData.cfRtmpUrl, cfStreamKey: cfData.cfStreamKey } : {}),
        },
        { status: 201 },
      );
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 11000 && attempt < 4) {
        roomCode = generateRoomCode();
        continue;
      }
      logger.error({ err }, "live_session.create_failed");
      return NextResponse.json(
        { error: "Couldn't create session" },
        { status: 500 },
      );
    }
  }
  return NextResponse.json(
    { error: "Couldn't allocate a room code" },
    { status: 500 },
  );
}
