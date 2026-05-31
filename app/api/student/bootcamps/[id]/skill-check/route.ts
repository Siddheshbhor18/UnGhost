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
import type { BootcampProgress } from "@/shared/types";
import {
  buildSkillCheckQuestions,
  toPublicSkillCheckQuestions,
} from "@/server/lib/skillcheck";

export const runtime = "nodejs";

const RETRY_COOLDOWN_MIN = 30;
const MAX_ATTEMPTS = 3;

interface Body {
  videoId: string;
  // `questions` from the client is intentionally IGNORED — the answer key is
  // rebuilt server-side so a tampered request can't forge a pass.
  answers: Array<{ questionId: string; answer: string | number }>;
}

/** GET — sanitized questions (no answer key) for the client to render. */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const videoId = new URL(req.url).searchParams.get("videoId");
  if (!videoId) {
    return NextResponse.json({ error: "videoId required" }, { status: 400 });
  }
  const bootcamp = await getBootcampById(params.id);
  if (!bootcamp) {
    return NextResponse.json({ error: "bootcamp not found" }, { status: 404 });
  }
  if (!bootcamp.enrolledStudentIds.includes(session.user.id)) {
    return NextResponse.json({ error: "not enrolled" }, { status: 403 });
  }
  const video = bootcamp.videos.find((v) => v.id === videoId);
  if (!video) {
    return NextResponse.json({ error: "video not found" }, { status: 404 });
  }
  return NextResponse.json({
    questions: toPublicSkillCheckQuestions(
      buildSkillCheckQuestions(video, bootcamp),
    ),
  });
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
  if (!body?.videoId || !Array.isArray(body.answers)) {
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
  const video = bootcamp.videos.find((v) => v.id === body.videoId);
  if (!video) {
    return NextResponse.json({ error: "video not found" }, { status: 404 });
  }
  // Authoritative questions (with answer key) rebuilt server-side. The
  // client's submitted answers are graded against THESE, never against any
  // client-supplied question set.
  const questions = buildSkillCheckQuestions(video, bootcamp);

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

  // Grade against the authoritative server-side questions.
  const grade = await getAI().gradeSkillCheck(body.answers, questions);

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
