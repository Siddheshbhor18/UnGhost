/**
 * PATCH /api/admin/live-sessions/[id]
 *   Update one of: title, description, startsAt, durationMin,
 *   youtubeVideoId, status, recordingUrl.
 *   Admin-only. Status transitions:
 *     scheduled → live    (admin pastes video ID + clicks "Go Live")
 *     live      → ended   (admin clicks "End session" after broadcast)
 *     any       → cancelled (admin cancels before/during)
 *
 * DELETE /api/admin/live-sessions/[id]
 *   Hard-delete a session. Allowed only when status='scheduled' and no
 *   attendees have joined yet (otherwise it'd orphan chat history).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { connectMongo } from "@/server/db/mongo";
import {
  LiveSessionAttendeeModel,
  LiveSessionMessageModel,
  LiveSessionModel,
} from "@/server/db/models";
import { logger } from "@/server/lib/logger";
import { provisionCloudflareStream } from "@/server/store";

const patchSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  startsAt: z.string().min(1).optional(),
  durationMin: z.number().int().min(15).max(360).optional(),
  youtubeVideoId: z.string().trim().optional(),
  streamProvider: z.enum(["youtube", "cloudflare"]).optional(),
  status: z.enum(["scheduled", "live", "ended", "cancelled"]).optional(),
  recordingUrl: z.string().url().optional(),
});

/** Extract a YouTube video ID from any of the common URL shapes the admin
 *  might paste (full watch URL, share URL, embed URL, or just the ID). */
function normaliseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  // Bare ID — YouTube IDs are 11 chars of [A-Za-z0-9_-].
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  // Try parsing as URL.
  try {
    const u = new URL(trimmed);
    // youtube.com/watch?v=XYZ
    const v = u.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    // youtu.be/XYZ
    if (u.hostname.endsWith("youtu.be")) {
      const id = u.pathname.replace(/^\//, "").slice(0, 11);
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
    // youtube.com/embed/XYZ or /live/XYZ
    const segments = u.pathname.split("/").filter(Boolean);
    for (const seg of segments) {
      if (/^[A-Za-z0-9_-]{11}$/.test(seg)) return seg;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = {};
  for (const k of [
    "title",
    "description",
    "startsAt",
    "durationMin",
    "recordingUrl",
  ] as const) {
    if (parsed.data[k] !== undefined) updates[k] = parsed.data[k];
  }
  if (parsed.data.youtubeVideoId !== undefined) {
    const id = normaliseYouTubeId(parsed.data.youtubeVideoId);
    if (!id) {
      return NextResponse.json(
        {
          error:
            "Couldn't read a YouTube video ID from that. Paste the share URL or just the 11-char ID.",
        },
        { status: 400 },
      );
    }
    updates.youtubeVideoId = id;
  }
  if (parsed.data.streamProvider !== undefined) {
    updates.streamProvider = parsed.data.streamProvider;
  }

  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status;
    if (parsed.data.status === "live") {
      updates.startedAt = new Date().toISOString();
    } else if (
      parsed.data.status === "ended" ||
      parsed.data.status === "cancelled"
    ) {
      updates.endedAt = new Date().toISOString();
    }
  }

  await connectMongo();

  // If switching to cloudflare and not yet provisioned, auto-provision
  if (parsed.data.streamProvider === "cloudflare") {
    const existing = await LiveSessionModel.findById(params.id)
      .select("cfLiveInputUid")
      .lean();
    if (existing && !(existing as any).cfLiveInputUid) {
      try {
        const cf = await provisionCloudflareStream(params.id);
        updates.cfLiveInputUid = cf.cfLiveInputUid;
        updates.cfRtmpUrl = cf.cfRtmpUrl;
        updates.cfStreamKey = cf.cfStreamKey;
      } catch (err) {
        logger.error({ err, sessionId: params.id }, "cf_stream.provision_failed");
      }
    }
  }

  const result = await LiveSessionModel.updateOne(
    { _id: params.id },
    { $set: updates },
  );
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  logger.info(
    {
      sessionId: params.id,
      adminUserId: session.user.id,
      fields: Object.keys(updates),
    },
    "live_session.updated",
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await connectMongo();
  const ls = await LiveSessionModel.findById(params.id)
    .select("status")
    .lean();
  if (!ls) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (ls.status !== "scheduled") {
    return NextResponse.json(
      {
        error:
          "Only scheduled (not yet started) sessions can be hard-deleted. Cancel instead.",
      },
      { status: 400 },
    );
  }
  // Safety: refuse if any attendee or message already attached. Forces
  // admin to use 'cancelled' status instead, preserving the audit trail.
  const [attendees, messages] = await Promise.all([
    LiveSessionAttendeeModel.countDocuments({ sessionId: params.id }),
    LiveSessionMessageModel.countDocuments({ sessionId: params.id }),
  ]);
  if (attendees > 0 || messages > 0) {
    return NextResponse.json(
      {
        error: `Session has ${attendees} attendees + ${messages} messages. Cancel instead of delete.`,
      },
      { status: 400 },
    );
  }
  await LiveSessionModel.deleteOne({ _id: params.id });
  logger.info(
    { sessionId: params.id, adminUserId: session.user.id },
    "live_session.deleted",
  );
  return NextResponse.json({ ok: true });
}
