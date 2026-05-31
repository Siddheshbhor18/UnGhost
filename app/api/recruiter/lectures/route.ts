import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  createRoomLecture,
  listRoomLecturesByRecruiter,
  getUserById,
  writeAuditLog,
} from "@/server/store";
import { ROOM_IDS } from "@/shared/rooms";

export const runtime = "nodejs";

// videoUrl must be a real playback target: an https URL (R2/YouTube) or our
// own mock-mode same-origin playback handler. Blocks javascript:/data: URIs.
const VideoUrl = z
  .string()
  .trim()
  .min(5)
  .max(2000)
  .refine(
    (u) =>
      /^https?:\/\//i.test(u) ||
      u.startsWith("/api/recruiter/upload-video/get"),
    { message: "invalid_video_url" },
  );

const CreateInput = z.object({
  room: z.enum(ROOM_IDS),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).default(""),
  videoUrl: VideoUrl,
  posterUrl: z.string().trim().max(2000).optional(),
  durationMin: z.number().int().min(0).max(1000).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters_only" }, { status: 403 });
  }
  return NextResponse.json(await listRoomLecturesByRecruiter(session.user.id));
}

async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters_only" }, { status: 403 });
  }
  const parsed = await parseBody(req, CreateInput);
  if (!parsed.ok) return parsed.response;
  const b = parsed.data;

  const user = await getUserById(session.user.id);

  const lecture = await createRoomLecture({
    room: b.room,
    recruiterId: session.user.id,
    companyId: user?.companyId,
    title: b.title,
    description: b.description,
    videoUrl: b.videoUrl,
    posterUrl: b.posterUrl,
    durationMin: b.durationMin,
  });

  void writeAuditLog({
    actorId: session.user.id,
    actorRole: "recruiter",
    action: "lecture.create",
    targetType: "lecture",
    targetId: lecture.id,
    summary: `Lecture "${b.title}" posted to ${b.room} room`,
  }).catch(() => {});

  return NextResponse.json(lecture, { status: 201 });
}

// Generous cap for a trusted lecturer; stops a runaway script.
export const POST = withRateLimit(
  { bucket: "lecture.create", limit: 30, windowSec: 60 * 60, by: "user" },
  withApiErrorTracking(handler),
);
