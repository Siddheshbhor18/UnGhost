import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import {
  getBootcampById,
  getBootcampProgress,
  upsertBootcampProgress,
} from "@/server/store";
import type { BootcampProgress } from "@/shared/types";

export const runtime = "nodejs";

// Progress is self-reported. Even so, `videoId` should stay bounded and
// `liveAttendancePct` should be a real percentage — unbounded values would
// pollute analytics and could carry an arbitrarily large blob into Mongo.
const Input = z.object({
  videoId: z.string().min(1).max(64).optional(),
  watched: z.boolean().optional(),
  notes: z
    .object({
      videoId: z.string().min(1).max(64),
      content: z.string().max(20_000),
    })
    .optional(),
  liveAttended: z.boolean().optional(),
  liveAttendancePct: z.number().min(0).max(100).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const prog =
    (await getBootcampProgress(session.user.id, params.id)) ??
    seed(params.id);
  return NextResponse.json(prog);
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const bootcamp = await getBootcampById(params.id);
  if (!bootcamp) {
    return NextResponse.json({ error: "bootcamp not found" }, { status: 404 });
  }
  if (!bootcamp.enrolledStudentIds.includes(session.user.id)) {
    return NextResponse.json({ error: "not enrolled" }, { status: 403 });
  }

  const existing =
    (await getBootcampProgress(session.user.id, params.id)) ??
    seed(params.id);

  const next: BootcampProgress = {
    ...existing,
    videosWatched:
      body.videoId && body.watched
        ? Array.from(new Set([...existing.videosWatched, body.videoId]))
        : existing.videosWatched,
    notes: body.notes
      ? { ...existing.notes, [body.notes.videoId]: body.notes.content }
      : existing.notes,
    liveAttended:
      body.liveAttended !== undefined ? body.liveAttended : existing.liveAttended,
    liveAttendancePct:
      body.liveAttendancePct !== undefined
        ? body.liveAttendancePct
        : existing.liveAttendancePct,
  };

  await upsertBootcampProgress(session.user.id, next);
  return NextResponse.json(next);
}

function seed(bootcampId: string): BootcampProgress {
  return {
    bootcampId,
    videosWatched: [],
    skillChecksPassed: [],
    skillCheckAttempts: {},
    notes: {},
    liveAttended: false,
    verifiedBadgeIssued: false,
  };
}
