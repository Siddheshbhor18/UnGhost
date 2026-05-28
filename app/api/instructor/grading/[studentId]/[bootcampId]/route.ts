/**
 * PATCH /api/instructor/grading/[studentId]/[bootcampId]
 *
 * Apply an instructor override to an AI-graded assignment. Body fields
 * are all optional — only the keys you provide change, others stay. The
 * original AI grade snapshot is preserved in `grade.aiGrade` automatically
 * (handled by the store helper) so the override is auditable.
 *
 * Notifies the student via in-app notification + email so they know their
 * grade was reviewed by a human (and might be different than what they saw
 * on submit).
 *
 * Ownership-gated — instructor can only override grades on their own
 * bootcamps. Admins go through a separate route (not built; admin can
 * call the store helper directly for one-off fixes).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  applyInstructorGradeOverride,
  getBootcampById,
  getUserById,
  notify,
} from "@/server/store";
import { sendEmail } from "@/server/integrations/email";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

const CriterionSchema = z.object({
  key: z.string().min(1).max(64),
  score: z.number().int().min(0).max(100),
  feedback: z.string().trim().max(500),
});

const PatchSchema = z.object({
  totalScore: z.number().int().min(0).max(100).optional(),
  perCriterion: z.array(CriterionSchema).min(1).max(20).optional(),
  strengths: z.array(z.string().trim().max(500)).max(20).optional(),
  improvements: z.array(z.string().trim().max(500)).max(20).optional(),
  plagiarismFlag: z.boolean().optional(),
  instructorNote: z.string().trim().max(2000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { studentId: string; bootcampId: string } },
): Promise<NextResponse> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (session.user.role !== "instructor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400 },
    );
  }

  const result = await applyInstructorGradeOverride(
    session.user.id,
    params.studentId,
    params.bootcampId,
    parsed.data,
  );

  if (!result.ok) {
    const status =
      result.reason === "bootcamp_not_owned"
        ? 403
        : result.reason === "not_submitted" || result.reason === "not_graded"
          ? 404
          : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }

  // Notify the student. Fire-and-forget — the override is already committed
  // and the email failure shouldn't block the response.
  try {
    const [student, bootcamp] = await Promise.all([
      getUserById(params.studentId),
      getBootcampById(params.bootcampId),
    ]);
    if (student?.email && bootcamp) {
      await notify({
        userId: params.studentId,
        kind: "bootcamp_complete",
        priority: "high",
        title: `Your ${bootcamp.title} grade was reviewed`,
        body: `An instructor reviewed your submission. ${
          parsed.data.totalScore !== undefined
            ? `New score: ${parsed.data.totalScore}/100.`
            : "Feedback updated."
        }`,
        link: `/student/my-bootcamps/${params.bootcampId}/assignment`,
      });
      // Best-effort email — keep it terse.
      sendEmail({
        to: student.email,
        subject: `Instructor review · ${bootcamp.title}`,
        text:
          `Hi ${student.name ?? "there"},\n\n` +
          `Your ${bootcamp.title} bootcamp assignment was reviewed by an instructor.\n` +
          (parsed.data.totalScore !== undefined
            ? `Updated score: ${parsed.data.totalScore}/100.\n`
            : "") +
          (parsed.data.instructorNote
            ? `Instructor note: ${parsed.data.instructorNote}\n\n`
            : "") +
          `See full feedback: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/student/my-bootcamps/${params.bootcampId}/assignment\n\n` +
          `— unGhost`,
      }).catch((err) =>
        logger.error({ err }, "instructor.grade_review.email_failed"),
      );
    }
  } catch (err) {
    logger.error({ err }, "instructor.grade_review.notify_failed");
  }

  logger.info(
    {
      instructorId: session.user.id,
      studentId: params.studentId,
      bootcampId: params.bootcampId,
      fields: Object.keys(parsed.data),
    },
    "instructor.grade.overridden",
  );

  return NextResponse.json({ ok: true });
}
