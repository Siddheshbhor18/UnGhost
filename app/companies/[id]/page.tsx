import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Ghost,
  MapPin,
  Sparkles,
  TrendingUp,
  Users as UsersIcon,
} from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import {
  computeCompanyMetrics,
  getCompanyById,
  listJobs,
} from "@/server/store";

const CULTURE_NOTES: Record<string, string[]> = {
  default: [
    "Async-first communication, deep-work blocks protected daily",
    "Quarterly off-sites; remote-OK with optional Mumbai/Bengaluru hubs",
    "Engineering manager:engineer ratio capped at 1:6",
    "Public salary bands · transparent comp structure",
  ],
};

export default async function CompanyProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const company = await getCompanyById(params.id);
  if (!company) notFound();

  const [metrics, allJobs] = await Promise.all([
    computeCompanyMetrics(company.id),
    listJobs(),
  ]);
  const openJobs = allJobs.filter((j) => j.companyId === company.id);

  const ghostTone =
    metrics.ghostingRatePct > 20
      ? "danger"
      : metrics.ghostingRatePct > 10
      ? "warn"
      : "success";
  const slaPromise =
    metrics.avgResponseHours > 0 ? metrics.avgResponseHours : 48;

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-5xl px-4 pt-6 pb-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-5"
        >
          <ArrowLeft size={14} /> Back to dashboard
        </Link>

        {/* ── Hero ──────────────────────────────────────────────── */}
        <GlassCard variant="strong" className="!p-7 mb-6">
          <div className="flex items-start justify-between gap-5 flex-wrap">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              <CompanyLogo
                name={company.name}
                logoUrl={company.logoUrl}
                size={64}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <GlassBadge tone="brand">
                    <Building2 size={11} /> {company.domain}
                  </GlassBadge>
                  <GlassBadge tone={ghostTone}>
                    <Ghost size={10} /> {metrics.ghostingRatePct.toFixed(1)}%
                    ghost rate
                  </GlassBadge>
                </div>
                <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink">
                  {company.name}
                </h1>
                <p className="text-sm text-brand-muted mt-2 leading-relaxed max-w-2xl">
                  {company.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                Avg response
              </p>
              <p className="font-display font-extrabold text-2xl text-emerald-600">
                {slaPromise}h
              </p>
            </div>
          </div>
        </GlassCard>

        {/* ── Ghost Rate detailed callout ───────────────────────── */}
        <GlassCard glow className="!p-5 mb-6">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles size={11} /> The unGhost score
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            <ScoreCell
              tone={ghostTone}
              label="90-day ghost rate"
              value={`${metrics.ghostingRatePct.toFixed(1)}%`}
              hint="Lower is better"
            />
            <ScoreCell
              tone="brand"
              label="Apps received (90d)"
              value={metrics.applications90d}
              hint={`${metrics.breaches90d} breached SLAs`}
            />
            <ScoreCell
              tone="success"
              label="Hires (90d)"
              value={metrics.hires90d}
              hint="Closed offers · last 90 days"
            />
          </div>
          <p className="text-xs text-brand-muted mt-4 leading-relaxed">
            Every application here is bound to an SLA — miss it and the
            candidate&apos;s credit is refunded automatically, and this
            company&apos;s ghost rate increments. Lower is better.
          </p>
        </GlassCard>

        {/* ── Quick stats strip ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <Kpi
            icon={<Briefcase size={14} />}
            label="Open positions"
            value={metrics.openPositions}
            tone="brand"
          />
          <Kpi
            icon={<UsersIcon size={14} />}
            label="Recruiters"
            value={metrics.recruiterCount}
            tone="brand"
          />
          <Kpi
            icon={<TrendingUp size={14} />}
            label="Hires (90d)"
            value={metrics.hires90d}
            tone="success"
          />
          <Kpi
            icon={<Clock size={14} />}
            label="Avg response"
            value={`${slaPromise}h`}
            tone="success"
          />
        </div>

        {/* ── Open positions ────────────────────────────────────── */}
        {openJobs.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
              Open at {company.name}
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              {openJobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/missions/${j.id}`}
                  className="block rounded-2xl bg-white/55 backdrop-blur-xl border border-white/60 shadow-glass p-4 hover:-translate-y-0.5 hover:shadow-glass-hover transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="font-display font-semibold text-sm text-brand-ink line-clamp-1">
                      {j.title}
                    </p>
                    <GlassBadge
                      tone={
                        j.slaHours <= 24
                          ? "danger"
                          : j.slaHours <= 48
                          ? "warn"
                          : "brand"
                      }
                    >
                      {j.slaHours}h SLA
                    </GlassBadge>
                  </div>
                  <p className="text-xs text-brand-muted flex items-center gap-1.5 mb-2">
                    <MapPin size={10} /> {j.location} · {j.remote}
                  </p>
                  <p className="text-xs text-brand-ink/80">
                    ₹{j.salaryMin}–{j.salaryMax}L
                    {j.experienceMax > 0 && ` · ${j.experienceMin}–${j.experienceMax} yrs exp`}
                    {" · "}{j.skills.length} skills
                  </p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {j.skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-brand-ink/5 text-brand-muted font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Culture + perks ───────────────────────────────────── */}
        <GlassCard className="mb-6">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <Award size={11} /> How they work
          </p>
          <ul className="space-y-2">
            {(CULTURE_NOTES[company.id] ?? CULTURE_NOTES.default).map((c) => (
              <li
                key={c}
                className="flex items-start gap-2 text-sm text-brand-ink/85"
              >
                <CheckCircle2
                  size={14}
                  className="text-emerald-600 mt-0.5 shrink-0"
                />
                {c}
              </li>
            ))}
          </ul>
        </GlassCard>

        {/* ── Trust footer ──────────────────────────────────────── */}
        <p className="text-[11px] text-brand-muted text-center">
          Stats refreshed in real-time from active applications. Recruiter
          identities are gated until you advance past Stage 1.
        </p>
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

function ScoreCell({
  tone,
  label,
  value,
  hint,
}: {
  tone: "brand" | "success" | "warn" | "danger";
  label: string;
  value: string | number;
  hint: string;
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
    <div className="rounded-2xl bg-white/50 border border-brand-ink/5 p-4">
      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
        {label}
      </p>
      <p className={`font-display font-extrabold text-3xl mt-1 ${cls}`}>
        {value}
      </p>
      <p className="text-[10px] text-brand-muted mt-1">{hint}</p>
    </div>
  );
}
