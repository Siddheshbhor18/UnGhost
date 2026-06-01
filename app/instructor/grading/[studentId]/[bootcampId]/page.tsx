/**
 * /instructor/grading/[studentId]/[bootcampId] — detail + override page.
 *
 * Shows the student's writeup + reflection alongside the AI grade.
 * Instructor can edit any score / feedback / flag and Save.
 */
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  getBootcampById,
  getBootcampProgress,
  getUserById,
} from "@/server/store";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { GradingOverrideForm } from "./GradingOverrideForm";

export const dynamic = "force-dynamic";

export default async function InstructorGradeDetailPage({
  params,
}: {
  params: { studentId: string; bootcampId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect(
      `/login?next=/instructor/grading/${params.studentId}/${params.bootcampId}`,
    );
  }
  if (session.user.role !== "instructor") redirect("/");

  const [bootcamp, student, progress] = await Promise.all([
    getBootcampById(params.bootcampId),
    getUserById(params.studentId),
    getBootcampProgress(params.studentId, params.bootcampId),
  ]);

  if (!bootcamp) notFound();
  // Ownership check — if this isn't the instructor's bootcamp, bounce back.
  if (bootcamp.instructorId !== session.user.id) redirect("/instructor/grading");
  if (!student || !progress?.assignment?.submittedAt) notFound();

  const a = progress.assignment;
  const grade = a.grade;

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-4xl px-4 pt-6 pb-12 space-y-6">
        <div>
          <Link
            href="/instructor/grading"
            className="text-xs text-brand-muted hover:text-brand-ink transition"
          >
            ← All submissions
          </Link>
          <div className="flex items-start justify-between gap-3 mt-2 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-muted mb-1">
                {bootcamp.title}
              </p>
              <h1 className="font-display font-extrabold text-2xl text-brand-ink">
                {student.name}
              </h1>
              <p className="text-xs text-brand-muted">{student.email}</p>
              <p className="text-[11px] text-brand-muted mt-1">
                Submitted{" "}
                {new Date(a.submittedAt!).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {a.plagiarismFlag ? (
                <GlassBadge tone="danger">Plagiarism flagged</GlassBadge>
              ) : null}
              {typeof a.aiGeneratedLikelihood === "number" ? (
                <GlassBadge
                  tone={
                    a.aiGeneratedLikelihood >= 70
                      ? "danger"
                      : a.aiGeneratedLikelihood >= 40
                      ? "warn"
                      : "neutral"
                  }
                >
                  AI-written: {a.aiGeneratedLikelihood}%
                </GlassBadge>
              ) : null}
              {grade?.reviewedAt ? (
                <GlassBadge tone="success">Already reviewed</GlassBadge>
              ) : (
                <GlassBadge tone="warn">Awaiting review</GlassBadge>
              )}
            </div>
          </div>
        </div>

        {/* Student work */}
        <GlassCard className="!p-6 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2">
              Writeup
            </p>
            <p className="text-sm text-brand-ink whitespace-pre-wrap leading-relaxed">
              {a.writeup}
            </p>
          </div>
          <div className="border-t border-brand-ink/5 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2">
              Reflection
            </p>
            <p className="text-sm text-brand-ink whitespace-pre-wrap leading-relaxed">
              {a.reflection}
            </p>
          </div>
          {a.fileNames && a.fileNames.length > 0 ? (
            <div className="border-t border-brand-ink/5 pt-4">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2">
                Attached files
              </p>
              <ul className="text-xs text-brand-muted space-y-0.5">
                {a.fileNames.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </GlassCard>

        {/* Override form */}
        {grade ? (
          <GradingOverrideForm
            studentId={params.studentId}
            bootcampId={params.bootcampId}
            initial={{
              totalScore: grade.totalScore,
              perCriterion: grade.perCriterion,
              strengths: grade.strengths,
              improvements: grade.improvements,
              plagiarismFlag: a.plagiarismFlag ?? false,
              instructorNote: grade.instructorNote ?? "",
            }}
            aiSnapshot={grade.aiGrade ?? null}
          />
        ) : (
          <GlassCard className="text-center !py-8">
            <p className="text-sm text-brand-muted">
              No grade on record yet. The AI grader didn&apos;t run — re-submit
              from the student side or contact ops.
            </p>
          </GlassCard>
        )}
      </div>
    </main>
  );
}
