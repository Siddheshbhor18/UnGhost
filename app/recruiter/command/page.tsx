import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { BlobField, GlassBadge, GlassCard, GlassNavbar } from "@/components/glass";
import { KanbanBoard } from "@/components/recruiter/KanbanBoard";
import {
  getCompanyById,
  getUserById,
  listApplicationsByRecruiter,
  listJobsByRecruiter,
  listUsers,
} from "@/server/store";
import { Plus, Building2, Users, Target, Clock, TrendingUp } from "lucide-react";

export default async function CommandCenter() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=recruiter");
  if (session.user.role !== "recruiter") {
    redirect(session.user.role === "admin" ? "/admin/metrics" : "/dashboard");
  }

  const [apps, jobs, user, studentList] = await Promise.all([
    listApplicationsByRecruiter(session.user.id),
    listJobsByRecruiter(session.user.id),
    getUserById(session.user.id),
    listUsers("student"),
  ]);
  const co = user?.companyId ? await getCompanyById(user.companyId) : undefined;

  const jobIndex = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const students = Object.fromEntries(studentList.map((u) => [u.id, u]));

  // Stats
  const avgMatch = apps.length
    ? Math.round(apps.reduce((s, a) => s + a.matchPct, 0) / apps.length)
    : 0;
  const inInterview = apps.filter((a) => a.stage === "interview").length;
  const hired = apps.filter((a) => a.stage === "hired").length;
  const ghostRate = apps.length
    ? Math.round((apps.filter((a) => a.stage === "rejected").length / apps.length) * 100)
    : 0;

  // Per-job rollup
  const jobRollup = jobs.map((j) => {
    const jobApps = apps.filter((a) => a.jobId === j.id);
    const avg = jobApps.length
      ? Math.round(jobApps.reduce((s, a) => s + a.matchPct, 0) / jobApps.length)
      : 0;
    return { job: j, count: jobApps.length, avg };
  });

  return (
    <main className="min-h-screen relative">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <GlassBadge tone="brand">
              <Building2 size={12} /> Command Center
            </GlassBadge>
            <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
              {co?.name ?? "Your Pipeline"}
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              {jobs.length} mission{jobs.length === 1 ? "" : "s"} live · {apps.length}{" "}
              applicant{apps.length === 1 ? "" : "s"} in flight
            </p>
          </div>
          <Link href="/recruiter/deploy" className="btn-brand">
            <Plus size={16} /> Deploy Mission
          </Link>
        </div>

        {/* KPI strip */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Kpi icon={<Users size={18} />} label="Applicants" value={apps.length} tone="brand" />
          <Kpi
            icon={<Target size={18} />}
            label="Avg Compatibility"
            value={`${avgMatch}%`}
            tone={avgMatch >= 70 ? "success" : avgMatch >= 50 ? "warn" : "danger"}
          />
          <Kpi icon={<Clock size={18} />} label="In Interview" value={inInterview} tone="warn" />
          <Kpi
            icon={<TrendingUp size={18} />}
            label="Hires"
            value={hired}
            tone="success"
          />
        </div>

        {/* Mission rollup */}
        {jobRollup.length > 0 ? (
          <div className="mb-8">
            <h2 className="font-display text-lg font-semibold text-brand-ink mb-3">
              Active Missions
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobRollup.map(({ job, count, avg }) => (
                <GlassCard key={job.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-semibold text-brand-ink line-clamp-1">
                        {job.title}
                      </p>
                      <p className="text-xs text-brand-muted mt-0.5">
                        ₹{job.salaryMin}–{job.salaryMax}L · {job.location}
                      </p>
                    </div>
                    <GlassBadge tone={job.slaHours <= 24 ? "danger" : job.slaHours <= 48 ? "warn" : "neutral"}>
                      {job.slaHours}h SLA
                    </GlassBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-ink/5">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-brand-muted">
                        Applicants
                      </p>
                      <p className="font-display text-xl font-bold text-brand-primary">
                        {count}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-brand-muted">
                        Avg Match
                      </p>
                      <p
                        className={`font-display text-xl font-bold ${
                          avg >= 70
                            ? "text-emerald-600"
                            : avg >= 50
                            ? "text-amber-600"
                            : "text-rose-600"
                        }`}
                      >
                        {avg}%
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.slice(0, 3).map((s) => (
                      <GlassBadge key={s} tone="neutral">
                        {s}
                      </GlassBadge>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        ) : (
          <GlassCard className="mb-8 text-center">
            <p className="text-brand-muted">
              No missions deployed yet.{" "}
              <Link href="/recruiter/deploy" className="text-brand-primary font-semibold">
                Deploy your first mission →
              </Link>
            </p>
          </GlassCard>
        )}

        {/* Pipeline */}
        <div>
          <h2 className="font-display text-lg font-semibold text-brand-ink mb-3">
            Pipeline
          </h2>
          <KanbanBoard applications={apps} jobs={jobIndex} students={students} />
        </div>

        {/* Anti-ghost banner */}
        {ghostRate > 0 && (
          <GlassCard className="mt-8 bg-rose-50/40 border-rose-200/40">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wider text-rose-700 font-semibold">
                  Ghost-rate monitor
                </p>
                <p className="text-sm text-brand-ink mt-1">
                  {ghostRate}% of applicants got a hard no — unGhost requires feedback for every
                  reject. Keep that streak clean.
                </p>
              </div>
              <GlassBadge tone={ghostRate > 30 ? "danger" : "warn"}>{ghostRate}%</GlassBadge>
            </div>
          </GlassCard>
        )}
      </div>
    </main>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "brand" | "success" | "warn" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "danger"
      ? "text-rose-600"
      : "text-brand-primary";
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-2">
        <span className={`${toneCls}`}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`font-display text-3xl font-bold ${toneCls}`}>{value}</p>
    </GlassCard>
  );
}
