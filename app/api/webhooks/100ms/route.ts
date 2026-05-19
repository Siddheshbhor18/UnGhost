import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { logger } from "@/server/lib/logger";
import {
  SessionRecordingModel,
  LiveSessionModel,
} from "@/server/db/models";
import { connectMongo } from "@/server/db/mongo";
import { getBootcampById } from "@/server/store";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/100ms
 *
 * 100ms hits this after `recording.success`, `beam.recording.success`, and
 * a handful of other lifecycle events. We only care about recording-success
 * here — that's when the asset is available and we can stash it under a
 * SessionRecording row for instructor review.
 *
 * Security:
 *   - HMAC signature header `x-hms-signature` verified against
 *     <font face='Courier' size='9'>HMS_WEBHOOK_SECRET</font>.
 *   - Replay protection — idempotent insert on sessionId.
 *
 * The route is mock-friendly: when HMS_WEBHOOK_SECRET is missing we accept
 * unsigned bodies so a local script can post a fake event.
 */
async function handler(req: Request) {
  const raw = await req.text();

  const secret = process.env.HMS_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-hms-signature") ?? "";
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    const provided = Buffer.from(sig, "hex");
    const exp = Buffer.from(expected, "hex");
    if (
      provided.length !== exp.length ||
      !timingSafeEqual(provided, exp)
    ) {
      logger.warn({ source: "100ms" }, "webhook.signature-mismatch");
      return NextResponse.json({ error: "bad_signature" }, { status: 401 });
    }
  }

  let payload: {
    type?: string;
    data?: {
      room_id?: string;
      session_id?: string;
      recording_id?: string;
      recording_path?: string;
      thumbnails?: string[];
      duration?: number;
      size?: number;
    };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_payload" }, { status: 400 });
  }

  // We only care about recording-completed events. Anything else gets a 200
  // so 100ms doesn't retry forever.
  const t = payload.type ?? "";
  if (!t.includes("recording.success") && !t.includes("beam.recording.success")) {
    return NextResponse.json({ ok: true, ignored: t });
  }

  const roomId = payload.data?.room_id;
  if (!roomId) {
    return NextResponse.json({ error: "missing_room_id" }, { status: 400 });
  }

  await connectMongo();
  const live = (await LiveSessionModel.findOne({
    videoRoomId: roomId,
  }).lean()) as unknown as { _id: string; instructorId: string; bootcampId: string; title: string } | null;
  if (!live) {
    logger.warn({ roomId }, "webhook.100ms-room-not-found");
    return NextResponse.json({ ok: true, ignored: "room_not_found" });
  }

  // Idempotency — if a recording row already exists for this session, just
  // refresh its URL fields rather than inserting again.
  const existing = await SessionRecordingModel.findOne({
    sessionId: live._id,
  }).lean();
  const bootcamp = await getBootcampById(live.bootcampId);

  if (existing) {
    await SessionRecordingModel.updateOne(
      { sessionId: live._id },
      {
        $set: {
          providerAssetId: payload.data?.recording_id,
          playbackUrl: payload.data?.recording_path,
          thumbnailUrl: payload.data?.thumbnails?.[0],
          durationSec: payload.data?.duration,
          sizeBytes: payload.data?.size,
        },
      },
    );
    return NextResponse.json({ ok: true, updated: true });
  }

  const recId = `rec_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  await SessionRecordingModel.create({
    _id: recId,
    sessionId: live._id,
    bootcampId: live.bootcampId,
    instructorId: live.instructorId,
    sessionTitle: live.title,
    bootcampTitle: bootcamp?.title ?? "",
    providerAssetId: payload.data?.recording_id,
    playbackUrl: payload.data?.recording_path,
    thumbnailUrl: payload.data?.thumbnails?.[0],
    durationSec: payload.data?.duration,
    sizeBytes: payload.data?.size,
    status: "pending_review",
    createdAt: new Date().toISOString(),
    provider: "100ms",
  });

  // Mirror playbackUrl onto LiveSession for legacy reads.
  await LiveSessionModel.updateOne(
    { _id: live._id },
    { $set: { recordingUrl: payload.data?.recording_path } },
  );

  logger.info(
    { sessionId: live._id, recordingId: recId },
    "webhook.100ms-recording-captured",
  );
  return NextResponse.json({ ok: true, recordingId: recId });
}

export const POST = withApiErrorTracking(handler);
