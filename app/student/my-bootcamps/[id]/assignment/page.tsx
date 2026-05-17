import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getBootcampById,
  getBootcampProgress,
} from "@/server/store";
import { BlobField, GlassNavbar } from "@/components/glass";
import { AssignmentView } from "@/components/student/AssignmentView";
import type {
  BootcampProgress,
} from "@/shared/types";
import type { AssignmentRubricCriterion } from "@/shared/types/ai";

// Mirror of the rubric defined in the API route. Real impl pulls per-instructor.
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

export default async function AssignmentPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session)
    redirect(`/login?next=/student/my-bootcamps/${params.id}/assignment`);
  if (session.user.role !== "student") redirect("/");

  const bootcamp = await getBootcampById(params.id);
  if (!bootcamp) notFound();
  if (!bootcamp.enrolledStudentIds.includes(session.user.id)) {
    redirect(`/bootcamp/${params.id}`);
  }

  const existing = await getBootcampProgress(session.user.id, params.id);
  // Seed assignment release if not present — PRD: released after live session.
  // Phase 1: release immediately on visit so the flow is exercisable.
  const now = new Date().toISOString();
  const progress: BootcampProgress = existing ?? {
    bootcampId: params.id,
    videosWatched: [],
    skillChecksPassed: [],
    skillCheckAttempts: {},
    notes: {},
    liveAttended: false,
    verifiedBadgeIssued: false,
    assignment: {
      releasedAt: now,
      // PRD: due 21 days after last live session
      expiresAt: new Date(Date.now() + 21 * 86400_000).toISOString(),
      healthPauseUsed: false,
    },
  };
  if (!progress.assignment) {
    progress.assignment = {
      releasedAt: now,
      expiresAt: new Date(Date.now() + 21 * 86400_000).toISOString(),
      healthPauseUsed: false,
    };
  }

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-12">
        <AssignmentView
          bootcamp={bootcamp}
          initialProgress={progress}
          rubric={RUBRIC}
        />
      </div>
    </main>
  );
}
