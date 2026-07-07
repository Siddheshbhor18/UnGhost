import Link from "next/link";
import { GlassBadge, GlassCard } from "@/components/glass";
import { ActionFeedItem } from "@/components/recruiter/ActionFeedItem";
import { SlaSweepButton } from "@/components/admin/SlaSweepButton";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  getGlobalMetrics,
  listBootcamps,
  listJobs,
  countUsersByRole,
  countPremiumUsers,
  getAdminApplicationAnalytics,
  getSkillGapHeatmap,
  maybeRunSlaSweep,
  detectTelemetryAlerts,
  computeFinancialRollup,
  listSupportTickets,
} from "@/server/store";
import { PLAN_PRICING } from "@/shared/types";
import {
  Activity,
  AlertTriangle,
  Banknote,
  Briefcase,
  Building2,
  CreditCard,
  FileWarning,
  Flag,
  Ghost,
  GraduationCap,
  Headphones,
  Sparkles,
  Users as UsersIcon,
  ShieldAlert,
} from "lucide-react";

export default async function AdminToday() {
  // SLA sweep + telemetry detection run concurrently with the page fetch (both
  // were blocking pre-steps that serialised onto the critical path). Durable
  // sweep mechanism is the /api/cron/sla-sweep cron; inline is a top-up.
  // Replaced full listUsers("student"/"recruiter") with countDocuments — admin
  // dashboard only consumed `.length`, so the full collection scan was waste.
  const [, telemetryAlerts, m, appAnalytics, jobs, bcs, studentCount, recruiterCount, heatmap, finance, premiumCount, tickets] =
    await Promise.all([
      maybeRunSlaSweep(),
      detectTelemetryAlerts(),
      getGlobalMetrics(),
      // Aggregates only — was a full `listApplications()` scan for a handful of
      // platform stats (distinct applicants, avg match, SLA breaches).
      getAdminApplicationAnalytics(),
      listJobs(),
      listBootcamps(),
      countUsersByRole("student"),
      countUsersByRole("recruiter"),
      getSkillGapHeatmap(),
      // Real revenue breakdown — bootcamp + sponsorship + monthly bucket
      // for MoM. Replaces the previous hardcoded "+18% MoM" string.
      computeFinancialRollup(),
      // Premium subscriber count — was a full `listUsers("student")` scan just
      // to count plan === "premium".
      countPremiumUsers(),
      // Real support queue — open + in-progress tickets.
      listSupportTickets(),
    ]);

  // ── KPIs ──
  const liveRevenue = m.liveRevenueINR;
  const totalUsers = studentCount + recruiterCount;
  const ghostingRate = m.ghostingRatePct;
  const activeMissions = m.activeMissions;
  const monthlyBootcampRevenue = bcs.reduce(
    (s, b) => s + b.enrolledStudentIds.length * b.priceINR,
    0,
  );
  const openTickets = tickets.filter(
    (t) => t.status === "open" || t.status === "in_progress",
  ).length;

  // ── Real platform-pulse signals (replaces the "+18% MoM" literal block) ──
  // MoM revenue change: compare the latest two months in finance.byMonth.
  // Returns null when there aren't two months of data — surface "—" so
  // we never lie about a trend that doesn't exist yet.
  const byMonth = finance.byMonth ?? [];
  const sortedMonths = [...byMonth].sort((a, b) => a.month.localeCompare(b.month));
  const cur = sortedMonths[sortedMonths.length - 1];
  const prev = sortedMonths[sortedMonths.length - 2];
  const momRevenuePct: number | null =
    cur && prev && prev.revenuePaise > 0
      ? Math.round(
          ((cur.revenuePaise - prev.revenuePaise) / prev.revenuePaise) * 100,
        )
      : null;

  // Conversion: students who have at least one application / total students.
  const conversionPct: number | null =
    studentCount > 0
      ? Math.round((appAnalytics.distinctApplicants / studentCount) * 100)
      : null;

  // Subscription revenue — Premium paid users × the lifetime plan price.
  // Premium is a one-time lifetime purchase, so it counts once. premiumCount
  // comes from countPremiumUsers() in the fetch above.
  const subscriptionRevenuePaise =
    premiumCount * PLAN_PRICING.premium.amountINR * 100;

  // Revenue mix — bootcamps + sponsorships + subscriptions.
  // When everything is zero (no cohort yet), `total` = 0 and we render "—".
  const total =
    finance.bootcampRevenuePaise +
    finance.sponsorshipRevenuePaise +
    subscriptionRevenuePaise;
  const mix =
    total > 0
      ? {
          bootcamps: Math.round(
            (finance.bootcampRevenuePaise / total) * 100,
          ),
          sponsorships: Math.round(
            (finance.sponsorshipRevenuePaise / total) * 100,
          ),
          subscriptions: Math.round(
            (subscriptionRevenuePaise / total) * 100,
          ),
        }
      : null;

  // Top-10 → hire correlation: avg matchPct of HIRED apps vs avg of ALL apps.
  // Both come from getAdminApplicationAnalytics() (single aggregation).
  const hiredAvgMatch = appAnalytics.hiredAvgMatch;
  const overallAvgMatch = appAnalytics.overallAvgMatch;

  // ── Critical (Severity-1) ──
  // Breach count: persisted slaRefundIssued flag (set by the sweep), plus any
  // unflagged-but-expired apps still in active stages — computed in the
  // getAdminApplicationAnalytics() aggregation above.
  const slaBreached = appAnalytics.slaBreached;
  const critical: Array<React.ReactElement> = [];
  if (slaBreached >= 3) {
    critical.push(
      <ActionFeedItem
        key="sla-spike"
        severity="critical"
        icon={<ShieldAlert size={18} />}
        title={`SLA breach spike — ${slaBreached} applications breached`}
        subtitle="Multiple recruiters trending above platform threshold"
        href="/admin/recruiters"
        cta="Investigate"
      />,
    );
  }
  if (ghostingRate > 25) {
    critical.push(
      <ActionFeedItem
        key="ghost"
        severity="critical"
        icon={<Ghost size={18} />}
        title={`Platform ghosting rate ${ghostingRate.toFixed(1)}% — above 25%`}
        subtitle="Above our 25% internal ceiling"
        href="/admin/telemetry"
        cta="Review"
      />,
    );
  }

  // ── Needs Review (Sev-2) ──
  const review: Array<React.ReactElement> = [];
  const top = heatmap[0];
  if (top && top.failureRate >= 50) {
    review.push(
      <ActionFeedItem
        key="content-gap"
        severity="warn"
        icon={<FileWarning size={18} />}
        title={`Content gap: ${top.failureRate}% failure on ${top.skill}`}
        subtitle="Telemetry recommends shipping a bootcamp"
        href="/admin/telemetry"
        cta="Generate brief"
      />,
    );
  }
  const lowRatedBcs = bcs.filter((b) => b.rating < 4.0).slice(0, 2);
  for (const b of lowRatedBcs) {
    review.push(
      <ActionFeedItem
        key={`bc-${b.id}`}
        severity="warn"
        icon={<Flag size={18} />}
        title={`Low rating: ${b.title} — ${b.rating}/5`}
        subtitle="Review content quality + instructor performance"
        href="/admin/bootcamps"
        cta="Open"
      />,
    );
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <AdminPageHeader
        badge="Operations"
        badgeTone="warn"
        title="Today"
        subtitle={
          <>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · every action audit-logged
          </>
        }
        actions={
          <>
            <SlaSweepButton />
            <Link href="/admin/metrics" className="btn-glass">
              <Activity size={14} /> Full metrics
            </Link>
            <Link href="/admin/telemetry" className="btn-brand">
              <Sparkles size={14} /> Telemetry
            </Link>
          </>
        }
      />

      {/* Daily Briefing */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-primary/10 via-white/60 to-white/40 backdrop-blur-xl border border-white/60 shadow-glass p-5">
        <div className="flex items-start gap-3">
          <div className="grid place-items-center w-9 h-9 rounded-xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-1">
              Platform Pulse — Daily Briefing
            </p>
            <p className="text-sm text-brand-ink leading-relaxed">
              <span className="font-semibold">{greeting}.</span> Platform served{" "}
              <span className="font-semibold">{totalUsers}</span> total users
              today. Ghosting rate{" "}
              <span
                className={
                  ghostingRate > 20
                    ? "text-rose-600 font-semibold"
                    : "text-emerald-600 font-semibold"
                }
              >
                {ghostingRate.toFixed(1)}%
              </span>
              . Bootcamp revenue MTD ₹
              {(monthlyBootcampRevenue / 1000).toFixed(0)}k.{" "}
              {critical.length > 0 ? (
                <span className="text-rose-600 font-semibold">
                  {critical.length} critical item{critical.length === 1 ? "" : "s"} need
                  attention.
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold">No critical items.</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* 6-Card Stat Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Kpi
          icon={<Banknote size={14} />}
          label="Live Revenue"
          value={`₹${(liveRevenue / 1000).toFixed(0)}k`}
          tone="success"
        />
        <Kpi
          icon={<UsersIcon size={14} />}
          label="Total users"
          value={totalUsers}
          tone="brand"
        />
        <Kpi
          icon={<Ghost size={14} />}
          label="Ghost Rate"
          value={`${ghostingRate.toFixed(1)}%`}
          tone={ghostingRate > 20 ? "danger" : ghostingRate > 10 ? "warn" : "success"}
        />
        <Kpi
          icon={<Briefcase size={14} />}
          label="Missions"
          value={activeMissions}
          tone="brand"
        />
        <Kpi
          icon={<GraduationCap size={14} />}
          label="Camp Revenue"
          value={`₹${(monthlyBootcampRevenue / 1000).toFixed(0)}k`}
          tone="warn"
        />
        <Kpi
          icon={<Headphones size={14} />}
          label="Open Tickets"
          value={openTickets}
          tone={openTickets > 5 ? "warn" : "brand"}
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-7">
          {/* Critical */}
          <FeedSection
            emoji="🚨"
            title="Critical"
            subtitle="Severity-1 — never collapsed"
            tone="rose"
          >
            {critical.length === 0 ? (
              <GlassCard className="text-center !py-6">
                <p className="text-sm text-brand-ink">
                  No critical items. Platform stable.
                </p>
              </GlassCard>
            ) : (
              critical
            )}
          </FeedSection>

          {/* Needs Review */}
          <FeedSection
            emoji="⚠️"
            title="Needs Review"
            subtitle="Severity-2 — review within SLA"
            tone="amber"
          >
            {review}
          </FeedSection>

          {/* Telemetry Alerts — live from detectTelemetryAlerts() */}
          <FeedSection
            emoji="🎯"
            title="Telemetry Alerts"
            subtitle="Real-time curriculum intelligence signals"
            tone="brand"
          >
            {telemetryAlerts.length === 0 ? (
              <GlassCard className="text-center !py-6">
                <p className="text-sm text-brand-ink">
                  No telemetry alerts firing. System healthy.
                </p>
              </GlassCard>
            ) : (
              telemetryAlerts.map((a) => (
                <ActionFeedItem
                  key={a.id}
                  severity={
                    a.severity === "critical"
                      ? "critical"
                      : a.severity === "warn"
                      ? "warn"
                      : "info"
                  }
                  icon={<Activity size={18} />}
                  title={a.title}
                  subtitle={a.body}
                  href={a.link}
                  cta="Investigate"
                />
              ))
            )}
          </FeedSection>
        </div>

        {/* AI Insights right */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Platform Pulse — all numbers are now computed live. Where a
              metric needs ≥2 months of data (MoM) or any data at all
              (conversion, match-rate), we show "—" rather than fake
              direction. Honest beats authoritative-but-wrong. */}
          <GlassCard glow className="!p-5">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold flex items-center gap-1.5 mb-3">
              <Sparkles size={12} /> Platform Pulse
            </p>
            <p className="text-sm text-brand-ink leading-relaxed">
              Marketplace health:{" "}
              <span className="text-emerald-600 font-semibold">healthy</span>.
              Revenue{" "}
              {momRevenuePct !== null ? (
                <>
                  <span
                    className={
                      momRevenuePct >= 0
                        ? "font-semibold text-emerald-600"
                        : "font-semibold text-rose-600"
                    }
                  >
                    {momRevenuePct >= 0 ? "+" : ""}
                    {momRevenuePct}%
                  </span>{" "}
                  MoM.
                </>
              ) : (
                <span className="font-semibold text-brand-muted">
                  — (need 2 months of data)
                </span>
              )}{" "}
              Signup → first-application conversion:{" "}
              <span className="font-semibold">
                {conversionPct !== null ? `${conversionPct}%` : "—"}
              </span>
              .{" "}
              {hiredAvgMatch !== null && overallAvgMatch !== null ? (
                <>
                  Hired-app avg match{" "}
                  <span className="font-semibold">{hiredAvgMatch}%</span> vs
                  overall <span className="font-semibold">{overallAvgMatch}%</span>.
                </>
              ) : (
                <>No hires recorded yet to compute match correlation.</>
              )}
            </p>
          </GlassCard>

          <GlassCard className="!p-5">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
              Revenue mix
            </p>
            {mix ? (
              <ul className="space-y-2.5 text-sm">
                <Row
                  label="Bootcamp sales"
                  value={`${mix.bootcamps}%`}
                  tone="success"
                />
                <Row
                  label="Sponsorships"
                  value={`${mix.sponsorships}%`}
                  tone="brand"
                />
                <Row
                  label="Subscriptions"
                  value={`${mix.subscriptions}%`}
                  tone="warn"
                />
              </ul>
            ) : (
              <p className="text-sm text-brand-muted">
                No revenue recorded yet — chart appears once the first
                paid enrolment or sponsorship lands.
              </p>
            )}
          </GlassCard>

          <GlassCard className="!p-5">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
              Compliance
            </p>
            <ul className="space-y-2 text-xs">
              <ComplianceRow ok label="DPDP Act — data residency Mumbai" />
              <ComplianceRow ok label="PhonePe webhooks HMAC-verified" />
              <ComplianceRow ok label="Every admin action audit-logged" />
              <ComplianceRow
                ok={false}
                label="GST monthly export — due 1st"
              />
            </ul>
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}

function FeedSection({
  emoji,
  title,
  subtitle,
  tone,
  children,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  tone: "rose" | "amber" | "brand";
  children: React.ReactNode;
}) {
  const accent =
    tone === "rose"
      ? "text-rose-700"
      : tone === "amber"
      ? "text-amber-700"
      : "text-brand-primary";
  return (
    <div>
      <div className="mb-3">
        <p
          className={`font-display font-bold text-lg flex items-center gap-2 ${accent}`}
        >
          <span>{emoji}</span> {title}
        </p>
        <p className="text-xs text-brand-muted">{subtitle}</p>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
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
    <GlassCard className="!p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className={cls}>{icon}</span>
        <span className="text-[9px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`font-display text-xl font-bold ${cls}`}>{value}</p>
    </GlassCard>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "success" | "warn";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : "text-brand-primary";
  return (
    <li className="flex items-center justify-between">
      <span className="text-brand-ink/85">{label}</span>
      <span className={`font-display font-bold ${cls}`}>{value}</span>
    </li>
  );
}

function ComplianceRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`grid place-items-center w-4 h-4 rounded-full ${
          ok ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
        }`}
      >
        {ok ? "✓" : "!"}
      </span>
      <span className={ok ? "text-brand-ink/80" : "text-amber-700 font-semibold"}>
        {label}
      </span>
    </li>
  );
}
