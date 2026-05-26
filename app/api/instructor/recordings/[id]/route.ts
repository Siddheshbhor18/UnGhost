import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import {
  deleteRecording,
  getRecordingById,
  publishRecording,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

const PatchInput = z.object({
  action: z.literal("publish"),
});

/**
 * PATCH /api/instructor/recordings/[id] { action: "publish" }
 *   Instructor presses Keep — flips status pending_review → published.
 *
 * DELETE /api/instructor/recordings/[id]
 *   Instructor presses Delete — flips status → deleted (row kept for
 *   audit, URLs stripped).
 */
async function patchHandler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "instructors only" }, { status: 403 });
  }
  const parsed = await parseBody(req, PatchInput);
  if (!parsed.ok) return parsed.response;

  const rec = await getRecordingById(params.id);
  if (!rec || rec.instructorId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (rec.status !== "pending_review") {
    return NextResponse.json(
      { error: "already_decided", status: rec.status },
      { status: 409 },
    );
  }

  const updated = await publishRecording(params.id, session.user.id);
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "instructor",
    action: "recording.published",
    targetType: "system",
    targetId: params.id,
    summary: `Published recording for ${rec.sessionTitle}`,
  });
  return NextResponse.json(updated);
}

async function deleteHandler(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "instructor") {
    return NextResponse.json({ error: "instructors only" }, { status: 403 });
  }

  const rec = await getRecordingById(params.id);
  if (!rec || rec.instructorId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await deleteRecording(params.id, session.user.id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason ?? "delete_failed" },
      { status: 502 },
    );
  }
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "instructor",
    action: "recording.deleted",
    targetType: "system",
    targetId: params.id,
    summary: `Deleted recording for ${rec.sessionTitle}`,
  });
  return NextResponse.json({ ok: true });
}

// 30 publishes/deletes per hour per instructor is plenty — guards against
// rage-click loops or a bug in the UI hammering the route.
export const PATCH = withRateLimit(
  { bucket: "instructor.recording.patch", limit: 30, windowSec: 3600, by: "user" },
  withApiErrorTracking(patchHandler),
);
export const DELETE = withRateLimit(
  { bucket: "instructor.recording.delete", limit: 30, windowSec: 3600, by: "user" },
  withApiErrorTracking(deleteHandler),
);
