import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import {
  Award,
  Briefcase,
  Clock,
  Ghost,
  TrendingDown,
  TrendingUp,
  Users as UsersIcon,
} from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import {
  computeCompanyMetrics,
  getCompanyById,
  getUserById,
  listApplicationsByRecruiter,
  listJobsByRecruiter,
} from "@/server/store";

export default async function RecruiterAnalytics() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=recruiter");
  if (session.user.role !== "recruiter") {
    redirect(session.user.role === "admin" ? "/admin/today" : "/dashboard");
  }

  const user = await getUserById(session.user.id);
  const [apps, jobs, companyMetrics] = await Promise.all([
    listApplicationsByRecruiter(session.user.id),
    listJobsByRecruiter(session.user.id),
    user?.companyId
      ? computeCompanyMetrics(user.companyId)
      : Promise.resolve(null),
  ]);
  const company = user?.companyId
    ? await getCompanyById(user.companyId)
    : null;

  // ── Personal metrics ──
  const totalApps = apps.length;
  const hires = apps.filter((a) => a.stage === "hired").length;
  const offered = apps.filter((a) => a.stage === "offer" || a.stage === "hired").length;
  const interviewed = apps.filter((a) =>
    ["interview", "offer", "hired"].includes(a.stage),
  ).length;
  const advanced = apps.filter((a) =>
    !["new_matches", "rejected"].includes(a.stage),
  ).length;
  const breached = apps.filter((a) => a.slaRefundIssued).length;
  const myGhostRate =
    totalApps > 0 ? (breached / totalApps) * 100 : 0;

  // Funnel conversion
  const conv = {
    advancedFromTotal:
      totalApps > 0 ? Math.round((advanced / totalApps) * 100) : 0,
    interviewFromAdvanced:
      advanced > 0 ? Math.round((interviewed / advanced) * 100) : 0,
    offerFromInterview:
      interviewed > 0 ? Math.round((offered / interviewed) * 100) : 0,
    hireFromOffer:
      offered > 0 ? Math.round((hires / offered) * 100) : 0,
  };

  // Approx time-to-hire (Phase 1 stand-in: SLA × stages × 1.5)
  const avgTtH =
    jobs.length > 0
      ? Math.round(
          jobs.reduce((s, j) => s + j.slaHours, 0) / jobs.length * 1.5 * 5,
        )
      : 0;

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-12">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <GlassBadge tone="brand">
              <TrendingUp size={11} /> Analytics
            </GlassBadge>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
              Your hiring scoreboard
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              Personal funnel + SLA compliance. Compared against{" "}
              {company?.name ?? "your company"} avg + industry benchmarks.
            </p>
          </div>
          <Link href="/recruiter/today" className="btn-glass">
            ← Today
          </Link>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Kpi
            icon={<Briefcase size={14} />}
            label="Applications"
            value={totalApps}
            tone="brand"
          />
          <Kpi
            icon={<UsersIcon size={14} />}
            label="In pipeline"
            value={apps.filter(
              (a) => !["hired", "rejected"].includes(a.stage),
            ).length}
            tone="brand"
          />
          <Kpi
            icon={<Award size={14} />}
            label="Hires"
            value={hires}
            tone="success"
          />
          <Kpi
            icon={<Clock size={14} />}
            label="Avg time-to-hire"
            value={`${avgTtH}h`}
            tone="warn"
          />
        </div>

        {/* SLA / Ghosting */}
        <div className="grid lg:grid-cols-2 gap-5 mb-6">
          <GlassCard
            glow
            className={`!p-5 ${
              myGhostRate > 10
                ? "bg-rose-500/5 border-rose-500/20"
                : "bg-emerald-500/5 border-emerald-500/20"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
              <Ghost size={11} /> Your ghosting rate
            </p>
            <p
              className={`font-display font-extrabold text-5xl ${
                myGhostRate > 10
                  ? "text-rose-600"
                  : myGhostRate > 5
                  ? "text-amber-600"
                  : "text-emerald-600"
              }`}
            >
              {myGhostRate.toFixed(1)}%
            </p>
            <p className="text-sm text-brand-muted mt-2 leading-relaxed">
              {breached} breached SLA out of {totalApps}. Company avg{" "}
              <span className="text-brand-ink font-semibold">
                {companyMetrics?.ghostingRatePct.toFixed(1) ?? "—"}%
              </span>
              .
            </p>
            {myGhostRate >
              (companyMetrics?.ghostingRatePct ?? Infinity) && (
              <p className="text-xs text-rose-700 font-semibold mt-3 inline-flex items-center gap-1">
                <TrendingDown size={11} /> You&apos;re trending above your
                company average. Tighten the SLA discipline.
              </p>
            )}
          </GlassCard>

          <GlassCard className="!p-5">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
              <Clock size={11} /> Response speed
            </p>
            <p className="font-display font-extrabold text-5xl text-brand-primary">
              {companyMetrics && companyMetrics.avgResponseHours > 0
                ? `${companyMetrics.avgResponseHours}h`
                : "—"}
            </p>
            <p className="text-sm text-brand-muted mt-2 leading-relaxed">
              {companyMetrics && companyMetrics.avgResponseHours > 0
                ? "Measured time to first recruiter response."
                : "No measured responses yet."}
              {jobs.length > 0 && (
                <>
                  {" "}Tightest SLA:{" "}
                  <span className="text-brand-ink font-semibold">
                    {Math.min(...jobs.map((j) => j.slaHours))}h
                  </span>
                  .
                </>
              )}
            </p>
          </GlassCard>
        </div>

        {/* Funnel */}
        <GlassCard className="!p-6 mb-6">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-4">
            Your funnel · last {totalApps} applications
          </p>
          <FunnelRow
            label="Application → Advanced past Stage 1"
            pct={conv.advancedFromTotal}
            from={totalApps}
            to={advanced}
          />
          <FunnelRow
            label="Advanced → Interview"
            pct={conv.interviewFromAdvanced}
            from={advanced}
            to={interviewed}
          />
          <FunnelRow
            label="Interview → Offer"
            pct={conv.offerFromInterview}
            from={interviewed}
            to={offered}
          />
          <FunnelRow
            label="Offer → Hire"
            pct={conv.hireFromOffer}
            from={offered}
            to={hires}
            last
          />
        </GlassCard>

        {/* Per-job table */}
        <GlassCard className="!p-0 overflow-x-auto">
          <div className="px-6 pt-6 pb-3">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
              Per-mission performance
            </p>
          </div>
          {jobs.length === 0 ? (
            <p className="text-sm text-brand-muted text-center py-8">
              You haven&apos;t posted any missions yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-ink/5">
                  <th className="px-6 py-3 font-semibold">Mission</th>
                  <th className="text-center font-semibold">Apps</th>
                  <th className="text-center font-semibold">Interviewed</th>
                  <th className="text-center font-semibold">Hired</th>
                  <th className="text-center font-semibold">Breach %</th>
                  <th className="text-right font-semibold">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/5">
                {jobs.map((j) => {
                  const jobApps = apps.filter((a) => a.jobId === j.id);
                  const jHires = jobApps.filter(
                    (a) => a.stage === "hired",
                  ).length;
                  const jInterviews = jobApps.filter((a) =>
                    ["interview", "offer", "hired"].includes(a.stage),
                  ).length;
                  const jBreaches = jobApps.filter(
                    (a) => a.slaRefundIssued,
                  ).length;
                  const jBreachPct =
                    jobApps.length > 0
                      ? Math.round((jBreaches / jobApps.length) * 100)
                      : 0;
                  return (
                    <tr key={j.id} className="hover:bg-white/40 transition">
                      <td className="px-6 py-3">
                        <Link
                          href={`/missions/${j.id}`}
                          className="text-brand-primary font-semibold hover:underline"
                        >
                          {j.title}
                        </Link>
                      </td>
                      <td className="text-center text-brand-ink">
                        {jobApps.length}
                      </td>
                      <td className="text-center text-brand-primary font-semibold">
                        {jInterviews}
                      </td>
                      <td className="text-center text-emerald-600 font-semibold">
                        {jHires}
                      </td>
                      <td
                        className={`text-center font-semibold ${
                          jBreachPct > 10
                            ? "text-rose-600"
                            : jBreachPct > 0
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        {jBreachPct}%
                      </td>
                      <td className="text-right text-brand-muted">
                        {j.slaHours}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </GlassCard>
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
  value: string | number;
  tone: "brand" | "success" | "warn" | "danger";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "danger"
      ? "text-rose-600"
      : "text-brand-primary";
  return (
    <GlassCard className="!p-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className={cls}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`font-display text-2xl font-bold ${cls}`}>{value}</p>
    </GlassCard>
  );
}

function FunnelRow({
  label,
  pct,
  from,
  to,
  last,
}: {
  label: string;
  pct: number;
  from: number;
  to: number;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${last ? "" : "mb-3"}`}>
      <div className="flex-1">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-brand-ink font-semibold">{label}</span>
          <span className="text-brand-muted">
            {to} of {from} · <span className="text-brand-ink font-semibold">{pct}%</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-brand-ink/5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
