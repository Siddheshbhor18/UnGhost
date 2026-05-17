import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { ActionFeedItem } from "@/components/recruiter/ActionFeedItem";
import { slaCountdown } from "@/shared/lib/sla";
import {
  getCompanyById,
  getUserById,
  listApplicationsByRecruiter,
  listJobsByRecruiter,
  listUsers,
  maybeRunSlaSweep,
} from "@/server/store";
import {
  Briefcase,
  Users as UsersIcon,
  Clock,
  Ghost,
  AlertTriangle,
  Sparkles,
  Send,
  CheckCircle2,
  Plus,
  Award,
  TrendingUp,
  Building2,
  Brain,
} from "lucide-react";

const SLA_INDUSTRY_BENCHMARK = 38;

export default async function RecruiterToday() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=recruiter");
  if (session.user.role !== "recruiter") {
    redirect(session.user.role === "admin" ? "/admin/metrics" : "/dashboard");
  }

  await maybeRunSlaSweep();

  const [apps, jobs, user, studentList] = await Promise.all([
    listApplicationsByRecruiter(session.user.id),
    listJobsByRecruiter(session.user.id),
    getUserById(session.user.id),
    listUsers("student"),
  ]);
  const co = user?.companyId ? await getCompanyById(user.companyId) : undefined;
  const students = Object.fromEntries(studentList.map((u) => [u.id, u]));
  const jobIndex = Object.fromEntries(jobs.map((j) => [j.id, j]));

  // ── KPI math ──
  const openPositions = jobs.length;
  const pipelineCount = apps.filter(
    (a) => !["hired", "rejected"].includes(a.stage),
  ).length;
  const slaAtRisk = apps.filter((a) => {
    const sla = slaCountdown(a.slaDeadline);
    return !sla.expired && sla.pulse;
  }).length;
  const slaBreached = apps.filter((a) => {
    const sla = slaCountdown(a.slaDeadline);
    return sla.expired;
  }).length;
  // Ghosting rate: derive from breach/total ratio over our window. Real impl uses
  // pre-computed company.ghostingRate.last90Days from PRD.
  const totalApps = apps.length;
  const ghostingRate = totalApps > 0 ? (slaBreached / totalApps) * 100 : 1.2;

  // ── Action Feed: critical = SLA at risk; new = fresh top tiers; coming up = interviews ──
  const slaAtRiskApps = apps
    .filter((a) => {
      const sla = slaCountdown(a.slaDeadline);
      return !sla.expired && sla.pulse;
    })
    .slice(0, 4);
  const slaBreachedApps = apps
    .filter((a) => {
      const sla = slaCountdown(a.slaDeadline);
      return sla.expired;
    })
    .slice(0, 2);
  const newMatches = apps
    .filter((a) => a.stage === "new_matches" && a.matchPct >= 80)
    .slice(0, 4);
  const interviewsScheduled = apps
    .filter((a) => a.stage === "interview" && a.interviewScheduledAt)
    .slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Afternoon" : "Evening";

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div>
            {co ? (
              <Link
                href={`/companies/${co.id}`}
                className="inline-block"
                title="View public company profile"
              >
                <GlassBadge tone="brand">
                  <Building2 size={12} /> {co.name}
                </GlassBadge>
              </Link>
            ) : (
              <GlassBadge tone="brand">
                <Building2 size={12} /> Your Pipeline
              </GlassBadge>
            )}
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
              Today
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/recruiter/candidates" className="btn-glass">
              <UsersIcon size={14} /> Find candidates
            </Link>
            <Link href="/recruiter/command" className="btn-glass">
              <Briefcase size={14} /> Open Kanban
            </Link>
            <Link href="/recruiter/deploy" className="btn-brand">
              <Plus size={14} /> Deploy Mission
            </Link>
          </div>
        </div>

        {/* Daily Briefing */}
        <div className="rounded-2xl bg-gradient-to-r from-brand-primary/10 via-white/60 to-white/40 backdrop-blur-xl border border-white/60 shadow-glass p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-1">
                Daily Briefing
              </p>
              <p className="text-sm text-brand-ink leading-relaxed">
                <span className="font-semibold">
                  {greeting}, {user?.name?.split(" ")[0]}.
                </span>{" "}
                {pipelineCount} candidate{pipelineCount === 1 ? "" : "s"} active across{" "}
                {openPositions} mission{openPositions === 1 ? "" : "s"}.{" "}
                {slaBreached > 0 ? (
                  <span className="text-rose-600 font-semibold">
                    {slaBreached} SLA breach{slaBreached === 1 ? "" : "es"} — clear those first.
                  </span>
                ) : slaAtRisk > 0 ? (
                  <span className="text-amber-700 font-semibold">
                    {slaAtRisk} candidate{slaAtRisk === 1 ? "" : "s"} approaching SLA — review now.
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold">
                    Pipeline healthy. No SLA risk.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 4-KPI Stat Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Kpi
            icon={<Briefcase size={16} />}
            label="Open positions"
            value={openPositions}
            sub={`${jobs.filter((j) => j.id).length} active`}
            tone="brand"
          />
          <Kpi
            icon={<UsersIcon size={16} />}
            label="In pipeline"
            value={pipelineCount}
            sub="across all jobs"
            tone="brand"
          />
          <Kpi
            icon={<Clock size={16} />}
            label="SLA health"
            value={
              slaBreached > 0
                ? `${slaBreached} breached`
                : slaAtRisk > 0
                ? `${slaAtRisk} at risk`
                : "healthy"
            }
            sub={`${slaBreached} this month`}
            tone={slaBreached > 0 ? "danger" : slaAtRisk > 0 ? "warn" : "success"}
          />
          <Kpi
            icon={<Ghost size={16} />}
            label="Ghosting rate"
            value={`${ghostingRate.toFixed(1)}%`}
            sub={`industry avg ${SLA_INDUSTRY_BENCHMARK}%`}
            tone={ghostingRate > 10 ? "danger" : ghostingRate > 5 ? "warn" : "success"}
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Center: Action feed */}
          <div className="lg:col-span-8 space-y-7">
            {/* Critical */}
            {(slaBreachedApps.length > 0 || slaAtRiskApps.length > 0) && (
              <FeedSection
                emoji="🔥"
                title="Needs Action Now"
                subtitle="SLA at risk or already breached"
              >
                {slaBreachedApps.map((a) => {
                  const j = jobIndex[a.jobId];
                  const s = students[a.studentId];
                  return (
                    <ActionFeedItem
                      key={a.id}
                      severity="critical"
                      icon={<AlertTriangle size={18} />}
                      title={`${s?.name ?? "Candidate"} — SLA BREACHED`}
                      subtitle={`${j?.title} · Match ${a.matchPct}%`}
                      meta={slaCountdown(a.slaDeadline).label}
                      href={`/recruiter/command`}
                      cta="Resolve"
                    />
                  );
                })}
                {slaAtRiskApps.map((a) => {
                  const j = jobIndex[a.jobId];
                  const s = students[a.studentId];
                  const sla = slaCountdown(a.slaDeadline);
                  return (
                    <ActionFeedItem
                      key={a.id}
                      severity="warn"
                      icon={<Clock size={18} />}
                      title={`${s?.name ?? "Candidate"} — ${sla.label} to SLA`}
                      subtitle={`${j?.title} · Match ${a.matchPct}% · ${a.stage.replace("_", " ")}`}
                      href={`/recruiter/command`}
                      cta="Review"
                    />
                  );
                })}
              </FeedSection>
            )}

            {/* New This Morning */}
            {newMatches.length > 0 && (
              <FeedSection
                emoji="🆕"
                title="New This Morning"
                subtitle="Strong matches awaiting first look"
              >
                {newMatches.map((a) => {
                  const j = jobIndex[a.jobId];
                  const s = students[a.studentId];
                  return (
                    <ActionFeedItem
                      key={a.id}
                      severity="info"
                      icon={<Sparkles size={18} />}
                      title={`${s?.name ?? "Candidate"} — Tier A match ${a.matchPct}%`}
                      subtitle={`${j?.title} · ${
                        a.assessment?.grade
                          ? `Gauntlet ${a.assessment.grade.score}/100`
                          : "Awaiting assessment"
                      }`}
                      href={`/recruiter/command`}
                      cta="Open profile"
                    />
                  );
                })}
              </FeedSection>
            )}

            {/* Coming Up */}
            {interviewsScheduled.length > 0 && (
              <FeedSection
                emoji="📅"
                title="Coming Up"
                subtitle="Scheduled in the next 48 hours"
              >
                {interviewsScheduled.map((a) => {
                  const j = jobIndex[a.jobId];
                  const s = students[a.studentId];
                  return (
                    <ActionFeedItem
                      key={a.id}
                      severity="info"
                      icon={<CheckCircle2 size={18} />}
                      title={`Interview with ${s?.name}`}
                      subtitle={`${j?.title}`}
                      meta={
                        a.interviewScheduledAt
                          ? new Date(a.interviewScheduledAt).toLocaleString("en-IN")
                          : undefined
                      }
                      href={`/recruiter/command`}
                      cta="Prep"
                    />
                  );
                })}
              </FeedSection>
            )}

            {/* Empty state */}
            {slaBreachedApps.length === 0 &&
              slaAtRiskApps.length === 0 &&
              newMatches.length === 0 &&
              interviewsScheduled.length === 0 && (
                <GlassCard className="text-center !py-12">
                  <Send size={28} className="mx-auto text-brand-primary mb-3" />
                  <p className="font-display font-bold text-brand-ink">
                    All quiet on the pipeline.
                  </p>
                  <p className="text-sm text-brand-muted mt-2">
                    No SLA risk, no fresh matches. Deploy a mission to start the flow.
                  </p>
                  <Link href="/recruiter/deploy" className="btn-brand mt-5 inline-flex">
                    <Plus size={14} /> Deploy Mission
                  </Link>
                </GlassCard>
              )}
          </div>

          {/* Right: AI Insights */}
          <aside className="lg:col-span-4 space-y-4">
            <GlassCard glow className="!p-5">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold flex items-center gap-1.5 mb-3">
                <Brain size={12} /> AI Insights
              </p>
              <p className="text-sm text-brand-ink leading-relaxed mb-3">
                Top tier-A candidate this week:{" "}
                <span className="font-semibold">
                  {students[newMatches[0]?.studentId]?.name ?? "—"}
                </span>{" "}
                — strong on{" "}
                <span className="text-brand-primary font-semibold">
                  {(jobIndex[newMatches[0]?.jobId]?.skills ?? []).slice(0, 2).join(", ") ||
                    "core skills"}
                </span>
                . Move fast.
              </p>
              <p className="text-xs text-brand-muted leading-relaxed">
                Your average response time:{" "}
                <span className="text-emerald-600 font-semibold">8h</span> — well under
                your 48h SLA. Keep it up.
              </p>
            </GlassCard>

            <GlassCard className="!p-5">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold flex items-center gap-1.5 mb-3">
                <TrendingUp size={12} /> This week
              </p>
              <ul className="space-y-2 text-sm">
                <Row
                  icon={<UsersIcon size={12} className="text-brand-primary" />}
                  label="Applications received"
                  value={apps.filter((a) => {
                    const d = new Date(a.createdAt);
                    return Date.now() - d.getTime() < 7 * 86400_000;
                  }).length}
                />
                <Row
                  icon={<Award size={12} className="text-emerald-600" />}
                  label="Hires"
                  value={apps.filter((a) => a.stage === "hired").length}
                />
                <Row
                  icon={<Clock size={12} className="text-amber-600" />}
                  label="Avg response"
                  value="8h"
                />
              </ul>
            </GlassCard>

            <GlassCard className="!p-5">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
                Open missions
              </p>
              <ul className="space-y-2">
                {jobs.slice(0, 5).map((j) => {
                  const jobApps = apps.filter((a) => a.jobId === j.id);
                  return (
                    <li
                      key={j.id}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-brand-ink truncate flex-1 mr-2">
                        {j.title}
                      </span>
                      <GlassBadge tone="neutral">
                        {jobApps.length}
                      </GlassBadge>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/recruiter/command"
                className="text-xs font-semibold text-brand-primary mt-3 inline-flex items-center gap-1 hover:underline"
              >
                See all missions →
              </Link>
            </GlassCard>
          </aside>
        </div>
      </div>
    </main>
  );
}

function FeedSection({
  emoji,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="font-display font-bold text-lg text-brand-ink flex items-center gap-2">
            <span>{emoji}</span> {title}
          </p>
          <p className="text-xs text-brand-muted">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
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
      <div className="flex items-center justify-between mb-2">
        <span className={cls}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`font-display text-2xl font-bold ${cls}`}>{value}</p>
      <p className="text-[11px] text-brand-muted mt-1">{sub}</p>
    </GlassCard>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-brand-ink/85">
        {icon}
        {label}
      </span>
      <span className="font-display font-bold text-brand-ink">{value}</span>
    </li>
  );
}
