import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import {
  rateLimit,
  rateLimitResponse,
  identifierFromRequest,
} from "@/server/lib/rate-limit";
import { getAI } from "@/server/integrations/ai";
import {
  getBootcampById,
  getBootcampProgress,
  upsertBootcampProgress,
} from "@/server/store";
import type { BootcampProgress } from "@/shared/types";
import {
  buildSkillCheckQuestions,
  toPublicSkillCheckQuestions,
} from "@/server/lib/skillcheck";

export const runtime = "nodejs";
// AI grading can run 10-30s; lift Vercel's function ceiling so a slow model
// reply isn't killed mid-request. Phase 1 (Inngest) moves these off-request.
export const maxDuration = 60;

const RETRY_COOLDOWN_MIN = 30;
const MAX_ATTEMPTS = 3;

// `questions` on the wire is intentionally IGNORED — the answer key is
// rebuilt server-side so a tampered request can't forge a pass. The bounds
// here just cap how much the AI grader has to chew through.
const PostInput = z.object({
  videoId: z.string().min(1).max(64),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(64),
        answer: z.union([z.string().max(4000), z.number()]),
      }),
    )
    .min(1)
    .max(50),
});

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
  // LLM-cost guard — grading fires a model call. The per-video attempt cooldown
  // below limits one lesson, but a per-user burst cap stops fanning calls across
  // many videos at once.
  const rl = await rateLimit(
    "ai.skill-check",
    identifierFromRequest(req, studentId),
    { limit: 20, windowSec: 60 },
  );
  if (!rl.allowed) return rateLimitResponse(rl);
  const parsed = await parseBody(req, PostInput);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

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
  const alreadyPassed = existing.skillChecksPassed.includes(body.videoId);
  const rawAttempts = existing.skillCheckAttempts[body.videoId] ?? 0;
  const lastAtStr = existing.skillCheckLastAttempt?.[body.videoId];
  const cooldownMs = RETRY_COOLDOWN_MIN * 60_000;
  const elapsedMs = lastAtStr
    ? Date.now() - new Date(lastAtStr).getTime()
    : Number.POSITIVE_INFINITY;
  const cooledDown = elapsedMs >= cooldownMs;

  // Out of attempts in the current window → wait out the cooldown, no permanent
  // lockout. Once the cooldown elapses the counter resets and they retry.
  if (!alreadyPassed && rawAttempts >= MAX_ATTEMPTS && !cooledDown) {
    const waitMin = Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 60_000));
    return NextResponse.json(
      {
        error: "cooldown",
        cooldownMin: waitMin,
        message: `You've used your attempts for now. Try again in ${waitMin} min.`,
      },
      { status: 429 },
    );
  }

  // Reset the window if the cooldown has elapsed since the last attempt.
  const attempts =
    !alreadyPassed && rawAttempts >= MAX_ATTEMPTS && cooledDown ? 0 : rawAttempts;

  // Grade against the authoritative server-side questions.
  const grade = await getAI().gradeSkillCheck(body.answers, questions);

  // Persist progress
  const nextProgress: BootcampProgress = {
    ...existing,
    skillCheckAttempts: {
      ...existing.skillCheckAttempts,
      [body.videoId]: attempts + 1,
    },
    skillCheckLastAttempt: {
      ...(existing.skillCheckLastAttempt ?? {}),
      [body.videoId]: new Date().toISOString(),
    },
    skillChecksPassed: grade.passed
      ? Array.from(new Set([...existing.skillChecksPassed, body.videoId]))
      : existing.skillChecksPassed,
    videosWatched: Array.from(
      new Set([...existing.videosWatched, body.videoId]),
    ),
  };
  await upsertBootcampProgress(studentId, nextProgress);

  // NOTE: passing a single lesson's skill-check does NOT verify the skill on
  // the student's profile. The recruiter-visible certification is
  // issued only on full completion (all lesson skill-checks + a passing graded
  // assignment) in the assignment route — so the signal recruiters filter on
  // can't be earned from one lesson's quiz.

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
    skillCheckLastAttempt: {},
    notes: {},
    liveAttended: false,
    verifiedBadgeIssued: false,
  };
}
