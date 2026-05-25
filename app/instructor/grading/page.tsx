/**
 * /instructor/grading — review queue.
 *
 * Lists every submitted assignment across the auth'd instructor's
 * bootcamps. AI auto-grades on submit, so this surface is review-and-
 * override rather than first-pass grading. Unreviewed rows surface first.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { listInstructorSubmissions } from "@/server/store";
import { BlobField, GlassBadge, GlassCard, GlassNavbar } from "@/components/glass";
import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InstructorGradingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/instructor/grading");
  if (session.user.role !== "instructor") redirect("/");

  const rows = await listInstructorSubmissions(session.user.id);
  const unreviewed = rows.filter((r) => !r.reviewed);
  const reviewed = rows.filter((r) => r.reviewed);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-12 space-y-6">
        <header>
          <GlassBadge tone="brand">
            <ClipboardCheck size={11} /> Grading
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl text-brand-ink mt-3">
            Review submissions
          </h1>
          <p className="text-sm text-brand-muted mt-1 max-w-2xl">
            AI grades submissions instantly so students don&apos;t wait. This
            queue is your chance to review, adjust scores, or flag plagiarism.
            Students get notified when you override.
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 max-w-xl">
          <GlassCard className="!p-4">
            <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">
              Awaiting review
            </p>
            <p className="font-display text-3xl font-bold text-amber-600 mt-1 tnum">
              {unreviewed.length}
            </p>
          </GlassCard>
          <GlassCard className="!p-4">
            <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
              Reviewed
            </p>
            <p className="font-display text-3xl font-bold text-emerald-600 mt-1 tnum">
              {reviewed.length}
            </p>
          </GlassCard>
          <GlassCard className="!p-4">
            <p className="text-[10px] uppercase tracking-wider text-rose-600 font-semibold">
              Plagiarism-flagged
            </p>
            <p className="font-display text-3xl font-bold text-rose-600 mt-1 tnum">
              {rows.filter((r) => r.plagiarismFlag).length}
            </p>
          </GlassCard>
        </div>

        <Section
          title="Awaiting review"
          empty="Caught up. New submissions appear here as students hit Submit."
          rows={unreviewed}
        />

        {reviewed.length > 0 ? (
          <Section
            title={`Recently reviewed (${reviewed.length})`}
            empty=""
            rows={reviewed.slice(0, 30)}
          />
        ) : null}
      </div>
    </main>
  );
}

function Section({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Awaited<ReturnType<typeof listInstructorSubmissions>>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display font-bold text-lg text-brand-ink">{title}</h2>
      {rows.length === 0 ? (
        <GlassCard className="text-center !py-10">
          <div className="mx-auto grid place-items-center w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 mb-3">
            <CheckCircle2 size={22} />
          </div>
          <p className="text-sm text-brand-muted">{empty}</p>
        </GlassCard>
      ) : (
        <div className="rounded-2xl bg-white/80 border border-brand-ink/10 overflow-hidden">
          {rows.map((r) => (
            <Link
              key={`${r.studentId}:${r.bootcampId}`}
              href={`/instructor/grading/${r.studentId}/${r.bootcampId}`}
              className="block px-4 py-3 border-b border-brand-ink/5 last:border-b-0 hover:bg-brand-ink/[0.02] transition"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-brand-ink">
                      {r.studentName}
                    </span>
                    <span className="text-[11px] text-brand-muted">
                      {r.studentEmail}
                    </span>
                    {r.plagiarismFlag ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                        <AlertTriangle size={9} /> plagiarism
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[12px] text-brand-ink/85 truncate">
                    {r.bootcampTitle}
                  </p>
                  <p className="text-[11px] text-brand-muted mt-0.5">
                    Submitted{" "}
                    {new Date(r.submittedAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={
                      r.totalScore >= 70
                        ? "font-display font-bold text-emerald-600 text-2xl tnum"
                        : r.totalScore >= 50
                          ? "font-display font-bold text-amber-600 text-2xl tnum"
                          : "font-display font-bold text-rose-600 text-2xl tnum"
                    }
                  >
                    {r.totalScore}
                    <span className="text-sm text-brand-muted">/100</span>
                  </p>
                  <p className="text-[10px] text-brand-muted">
                    {r.reviewed ? "Reviewed" : "AI grade only"}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
