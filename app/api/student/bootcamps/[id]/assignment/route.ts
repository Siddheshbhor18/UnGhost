import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { getAI } from "@/server/integrations/ai";
import type { AssignmentRubricCriterion } from "@/server/integrations/ai";
import {
  getBootcampById,
  getBootcampProgress,
  upsertBootcampProgress,
  markSkillVerified,
  notify,
} from "@/server/store";
import type { BootcampProgress } from "@/shared/types";

export const runtime = "nodejs";

// Minimum total score to earn the Verified Skill badge. Matches the 70%
// gate the student-facing UI already advertises.
const PASS_SCORE = 70;

// PRD: 5 criteria × 20 points each = 100. Instructor-defined; static for Phase 1.
const RUBRIC: AssignmentRubricCriterion[] = [
  {
    key: "conceptual_depth",
    label: "Conceptual depth",
    description:
      "Does the submission reason from first principles? Does it surface trade-offs?",
  },
  {
    key: "practical_applicability",
    label: "Practical applicability",
    description:
      "Could the submission run in production? Does it cite real examples or files?",
  },
  {
    key: "communication_clarity",
    label: "Communication clarity",
    description:
      "Is the writeup structured? Does it lead the reader, not dump on them?",
  },
  {
    key: "originality_of_thinking",
    label: "Originality of thinking",
    description:
      "Beyond the lesson — does the student bring an angle of their own?",
  },
  {
    key: "reflection_quality",
    label: "Reflection quality",
    description:
      "Self-aware on what was hard, what changed, what they'd do differently?",
  },
];

interface SubmitBody {
  writeup: string;
  reflection: string;
  fileNames?: string[];
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
  const body = (await req.json().catch(() => null)) as SubmitBody | null;
  if (!body?.writeup || !body.reflection) {
    return NextResponse.json(
      { error: "writeup and reflection are required" },
      { status: 400 },
    );
  }
  const wordCount = body.writeup.split(/\s+/).filter(Boolean).length;
  if (wordCount < 100) {
    return NextResponse.json(
      { error: "writeup must be at least 100 words" },
      { status: 400 },
    );
  }
  const bootcamp = await getBootcampById(params.id);
  if (!bootcamp) {
    return NextResponse.json({ error: "bootcamp not found" }, { status: 404 });
  }
  if (!bootcamp.enrolledStudentIds.includes(studentId)) {
    return NextResponse.json({ error: "not enrolled" }, { status: 403 });
  }

  const existing =
    (await getBootcampProgress(studentId, params.id)) ?? seed(params.id);
  // Lock only once the badge is actually earned. A failing submission can be
  // resubmitted — otherwise a low score would permanently bar the student.
  if (existing.verifiedBadgeIssued) {
    return NextResponse.json(
      { error: "already passed — badge already issued" },
      { status: 409 },
    );
  }

  const grade = await getAI().gradeAssignment(body, RUBRIC);
  const passed = grade.totalScore >= PASS_SCORE;

  const now = new Date().toISOString();
  const nextProgress: BootcampProgress = {
    ...existing,
    // Only issue the Verified Skill badge on a passing score.
    verifiedBadgeIssued: passed,
    assignment: {
      releasedAt: existing.assignment?.releasedAt ?? now,
      expiresAt:
        existing.assignment?.expiresAt ??
        new Date(Date.now() + 7 * 86400_000).toISOString(),
      healthPauseUsed: existing.assignment?.healthPauseUsed ?? false,
      submittedAt: now,
      writeup: body.writeup,
      reflection: body.reflection,
      fileNames: body.fileNames,
      grade: {
        totalScore: grade.totalScore,
        perCriterion: grade.perCriterion,
        strengths: grade.strengths,
        improvements: grade.improvements,
        gradedAt: now,
      },
      plagiarismFlag: grade.plagiarismFlag,
      aiGeneratedLikelihood: grade.aiGeneratedLikelihood,
    },
  };
  await upsertBootcampProgress(studentId, nextProgress);
  // Verified skill only marked on a pass — recruiters rely on this signal.
  if (passed) {
    await markSkillVerified(studentId, bootcamp.skill);
  }

  await notify({
    userId: studentId,
    kind: "bootcamp_complete",
    priority: passed ? "high" : "normal",
    title: passed
      ? `Bootcamp complete · ${grade.totalScore}/100`
      : `Assignment graded · ${grade.totalScore}/100 (need ${PASS_SCORE})`,
    body: passed
      ? `Verified Skill badge issued for ${bootcamp.skill}. Recruiters can now see it on your profile.`
      : `Not a pass yet — review the feedback and resubmit to earn the ${bootcamp.skill} badge.`,
    link: `/student/my-bootcamps/${bootcamp.id}/assignment`,
  });

  return NextResponse.json({
    grade,
    passed,
    progress: nextProgress,
    rubric: RUBRIC,
  });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  return NextResponse.json({ rubric: RUBRIC });
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
