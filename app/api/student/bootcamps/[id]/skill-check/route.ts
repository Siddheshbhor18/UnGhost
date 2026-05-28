import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { getAI } from "@/server/integrations/ai";
import {
  getBootcampById,
  getBootcampProgress,
  upsertBootcampProgress,
  markSkillVerified,
} from "@/server/store";
import type {
  BootcampProgress,
  StudentProfile,
} from "@/shared/types";
import type { SkillCheckQuestion } from "@/server/integrations/ai";

export const runtime = "nodejs";

const RETRY_COOLDOWN_MIN = 30;
const MAX_ATTEMPTS = 3;

interface Body {
  videoId: string;
  questions: SkillCheckQuestion[];
  answers: Array<{ questionId: string; answer: string | number }>;
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
  const studentId = session.user.id;
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.videoId || !Array.isArray(body.questions) || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const bootcamp = await getBootcampById(params.id);
  if (!bootcamp) {
    return NextResponse.json({ error: "bootcamp not found" }, { status: 404 });
  }
  // Authz: only enrolled students may post
  if (!bootcamp.enrolledStudentIds.includes(studentId)) {
    return NextResponse.json({ error: "not enrolled" }, { status: 403 });
  }

  // Cooldown / attempt check
  const existing =
    (await getBootcampProgress(studentId, params.id)) ?? initialProgress(params.id);
  const attempts = existing.skillCheckAttempts[body.videoId] ?? 0;
  if (attempts >= MAX_ATTEMPTS && !existing.skillChecksPassed.includes(body.videoId)) {
    return NextResponse.json(
      { error: "max attempts reached — contact instructor" },
      { status: 429 },
    );
  }

  // Grade
  const grade = await getAI().gradeSkillCheck(body.answers, body.questions);

  // Persist progress
  const nextProgress: BootcampProgress = {
    ...existing,
    skillCheckAttempts: {
      ...existing.skillCheckAttempts,
      [body.videoId]: attempts + 1,
    },
    skillChecksPassed: grade.passed
      ? Array.from(new Set([...existing.skillChecksPassed, body.videoId]))
      : existing.skillChecksPassed,
    videosWatched: Array.from(
      new Set([...existing.videosWatched, body.videoId]),
    ),
  };
  await upsertBootcampProgress(studentId, nextProgress);

  // On pass, mark the bootcamp's skill verified on the student profile too.
  if (grade.passed) {
    await markSkillVerified(studentId, bootcamp.skill);
  }

  return NextResponse.json({
    grade,
    progress: nextProgress,
    cooldownMin: grade.passed ? 0 : RETRY_COOLDOWN_MIN,
    attemptsLeft: MAX_ATTEMPTS - (attempts + 1),
  });
}

function initialProgress(bootcampId: string): BootcampProgress {
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

// Allow re-export for use by other modules typing.
export type _StudentProfile = StudentProfile;
