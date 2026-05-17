import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getBootcampById,
  getBootcampProgress,
  upsertBootcampProgress,
} from "@/server/store";
import type { BootcampProgress } from "@/shared/types";

export const runtime = "nodejs";

interface Body {
  videoId?: string;
  watched?: boolean;
  notes?: { videoId: string; content: string };
  liveAttended?: boolean;
  liveAttendancePct?: number;
}

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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
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
