import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Ghost,
  Hash,
  MapPin,
  Sparkles,
  Target,
  Trophy,
  XCircle,
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
  getJobById,
  getBootcampForSkill,
  getUserById,
  listApplicationsByStudent,
  listJobs,
} from "@/server/store";
import { getAI } from "@/server/integrations/ai";
import { computeMatchScore, skillDeltaCanon } from "@/server/lib/matching";
import { canonicalizeSkills } from "@/server/lib/skill-canon";
import { normalizeSkill } from "@/shared/skills";
import { effectivePlan } from "@/server/lib/quota";
import { PLAN_LIMITS } from "@/shared/types";
import {
  APPLY_THRESHOLD,
  computeCompleteness,
} from "@/server/lib/profile-completeness";


function tierFor(matchPct: number): {
  label: string;
  badgeTone: "success" | "brand" | "warn" | "danger";
  letter: "A" | "B" | "C" | "D";
} {
  if (matchPct >= 85)
    return { label: "Strong Match", badgeTone: "success", letter: "A" };
  if (matchPct >= 70)
    return { label: "Good Match", badgeTone: "brand", letter: "B" };
  if (matchPct >= 50)
    return { label: "Stretch Match", badgeTone: "warn", letter: "C" };
  return { label: "Long Shot", badgeTone: "danger", letter: "D" };
}

const PIPELINE_STAGES = [
  { key: "new_matches", label: "New Match" },
  { key: "under_review", label: "Under Review" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
];

export default async function MissionBrief({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?next=/missions/${params.id}`);

  const job = await getJobById(params.id);
  if (!job) notFound();

  const [co, user, allApps, allJobs, companyMetrics] = await Promise.all([
    getCompanyById(job.companyId),
    getUserById(session.user.id),
    listApplicationsByStudent(session.user.id),
    listJobs(),
    // Real 90-day ghosting rate for this company. Used by the mission-
    // brief badge + sidebar — was hardcoded `1.2%` for every job.
    computeCompanyMetrics(job.companyId),
  ]);
  const studentSkills = user?.profile?.skills ?? [];
  const verifiedLow = new Set(
    (user?.profile?.verifiedSkills ?? []).map(normalizeSkill),
  );
  const matchCanon = await canonicalizeSkills([
    ...studentSkills,
    ...(user?.profile?.verifiedSkills ?? []),
    ...job.skills,
  ]);
  const matchPct = user?.profile
    ? computeMatchScore(user.profile, job, matchCanon)
    : 0;
  const delta = await skillDeltaCanon(studentSkills, job.skills);
  const rows = await Promise.all(
    delta.map(async (d) => ({
      ...d,
      verified: verifiedLow.has(normalizeSkill(d.skill)),
      bootcampId: d.has ? undefined : (await getBootcampForSkill(d.skill))?.id,
    })),
  );

  // AI "Why You're a Match" — pulls from mock by default
  const whyMatch = user?.profile
    ? await getAI().whyMatch(user.profile, job)
    : null;

  const completeness = computeCompleteness(user);
  const canApply = completeness.pct >= APPLY_THRESHOLD;

  // Quota — plan-driven (single source of truth: PLAN_LIMITS).
  // SLA-breached apps get their slot returned (won't count against the cap).
  const applicationsUsed = allApps.filter((a) => !a.slaRefundIssued).length;
  const plan = user ? effectivePlan(user) : "free";
  const planAppCap = PLAN_LIMITS[plan].applicationCap;
  // -1 = unlimited (Premium): no ceiling, no upsell, no progress bar fill cap.
  const applicationsLimit =
    planAppCap.kind === "unlimited" ? -1 : planAppCap.count;
  const unlimitedApps = applicationsLimit < 0;
  const quotaTight =
    !unlimitedApps && applicationsUsed >= applicationsLimit - 1;
  const quotaUsedPct = unlimitedApps
    ? 0
    : Math.min(100, (applicationsUsed / applicationsLimit) * 100);
  // Free user who has used every application: even a complete profile can't
  // apply, so the assessment entry must become an upgrade prompt (the server
  // also 402s the apply itself; this gates the UI before they waste effort).
  const quotaExhausted = !unlimitedApps && applicationsUsed >= applicationsLimit;

  // Already applied?
  const existingApp = allApps.find((a) => a.jobId === job.id);

  // Similar missions: same role family heuristic via skill overlap.
  // Normalize keys so "React.js" vs "React" still counts as overlap.
  const jobSkillKeys = new Set(job.skills.map(normalizeSkill));
  const similar = allJobs
    .filter((j) => j.id !== job.id)
    .map((j) => ({
      job: j,
      overlap: j.skills.filter((s) => jobSkillKeys.has(normalizeSkill(s))).length,
    }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 4);

  const tier = tierFor(matchPct);
  // Real per-company ghosting rate over the trailing 90 days. Computed
  // from this company's applications: breaches ÷ total × 100. When the
  // company has <5 apps in the window we suppress the badge (small
  // sample = misleading), tracked via `hasGhostingSignal`.
  const ghostingRatePct = companyMetrics.ghostingRatePct;
  const hasGhostingSignal = companyMetrics.applications90d >= 5;

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-7xl px-4 pt-6 pb-12">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-5 hover:gap-2 transition-all"
        >
          <ArrowLeft size={14} /> Back to today
        </Link>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* ── Main column ────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-5">
            {/* Header */}
            <GlassCard variant="strong" className="!p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <GlassBadge tone="neutral">
                      <Building2 size={11} /> {co?.name}
                    </GlassBadge>
                    {hasGhostingSignal ? (
                      <GlassBadge
                        tone={ghostingRatePct > 10 ? "danger" : "success"}
                      >
                        <Ghost size={10} /> {ghostingRatePct.toFixed(1)}%
                        ghost rate
                      </GlassBadge>
                    ) : null}
                    <GlassBadge tone={tier.badgeTone}>
                      Tier {tier.letter} · {tier.label}
                    </GlassBadge>
                  </div>
                  <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink leading-tight">
                    {job.title}
                  </h1>
                </div>
              </div>

              {/* Key facts row */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-brand-ink/5">
                <KeyFact
                  icon={<MapPin size={13} />}
                  label="Location"
                  value={`${job.location} · ${job.remote}`}
                />
                <KeyFact
                  icon={<Banknote size={13} />}
                  label="Salary"
                  value={`₹${job.salaryMin}–${job.salaryMax}L`}
                />
                <KeyFact
                  icon={<Briefcase size={13} />}
                  label="Experience"
                  value={job.experienceMax > 0 ? `${job.experienceMin}–${job.experienceMax} yrs` : "Any"}
                />
                <KeyFact
                  icon={<Clock size={13} />}
                  label="SLA"
                  value={`${job.slaHours}h`}
                  tone={job.slaHours <= 24 ? "danger" : job.slaHours <= 48 ? "warn" : "brand"}
                />
                <KeyFact
                  icon={<Hash size={13} />}
                  label="Skills required"
                  value={`${job.skills.length}`}
                />
                <KeyFact
                  icon={<Target size={13} />}
                  label="Your match"
                  value={`${matchPct}%`}
                  tone={
                    matchPct >= 80
                      ? "success"
                      : matchPct >= 60
                      ? "brand"
                      : "warn"
                  }
                />
              </div>
            </GlassCard>

            {/* Why You're a Match */}
            {whyMatch && (
              <GlassCard
                glow
                className="bg-gradient-to-br from-brand-primary/8 via-white/60 to-white/40"
              >
                <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
                  <Sparkles size={12} /> Why you&apos;re a match
                </p>
                <p className="text-sm text-brand-ink leading-relaxed mb-4">
                  {whyMatch.summary}
                </p>
                {(whyMatch.strengths.length > 0 ||
                  whyMatch.risks.length > 0) && (
                  <div className="grid md:grid-cols-2 gap-3 pt-3 border-t border-brand-ink/5">
                    {whyMatch.strengths.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-1.5">
                          Strengths
                        </p>
                        <ul className="space-y-1">
                          {whyMatch.strengths.map((s, i) => (
                            <li
                              key={i}
                              className="text-xs text-brand-ink/90 flex items-start gap-1.5"
                            >
                              <CheckCircle2
                                size={12}
                                className="text-emerald-600 mt-0.5 shrink-0"
                              />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {whyMatch.risks.length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-1.5">
                          Watch for
                        </p>
                        <ul className="space-y-1">
                          {whyMatch.risks.map((r, i) => (
                            <li
                              key={i}
                              className="text-xs text-brand-ink/90 flex items-start gap-1.5"
                            >
                              <XCircle
                                size={12}
                                className="text-amber-600 mt-0.5 shrink-0"
                              />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            )}

            {/* Skill Delta Table */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
                  Skill delta
                </p>
                <p className="text-xs text-brand-muted">
                  {rows.filter((r) => r.has).length} of {rows.length} covered
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-ink/5">
                    <th className="py-2 font-semibold">Required skill</th>
                    <th className="font-semibold">Your level</th>
                    <th className="font-semibold">Status</th>
                    <th className="font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-ink/5">
                  {rows.map((r) => (
                    <tr key={r.skill}>
                      <td className="py-3 text-brand-ink font-medium">
                        {r.skill}
                      </td>
                      <td className="text-sm text-brand-ink/85">
                        {r.verified ? (
                          <span className="text-emerald-600 font-semibold">
                            Verified
                          </span>
                        ) : r.has ? (
                          <span className="text-brand-ink">Listed</span>
                        ) : (
                          <span className="text-brand-muted">—</span>
                        )}
                      </td>
                      <td>
                        {r.verified ? (
                          <GlassBadge tone="success">
                            <CheckCircle2 size={10} /> Verified
                          </GlassBadge>
                        ) : r.has ? (
                          <GlassBadge tone="brand">
                            <CheckCircle2 size={10} /> Have
                          </GlassBadge>
                        ) : (
                          <GlassBadge tone="warn">
                            <XCircle size={10} /> Gap
                          </GlassBadge>
                        )}
                      </td>
                      <td className="text-right">
                        {!r.has && r.bootcampId ? (
                          <Link
                            href={`/bootcamp/${r.bootcampId}`}
                            className="text-xs font-semibold text-brand-primary hover:underline"
                          >
                            Bridge with bootcamp →
                          </Link>
                        ) : !r.has ? (
                          <span className="text-xs text-brand-muted">
                            No bootcamp yet
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>

            {/* The Brief */}
            <GlassCard>
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
                The brief
              </p>
              <div className="text-sm text-brand-ink/90 leading-relaxed whitespace-pre-line">
                {job.description}
              </div>
            </GlassCard>

            {/* Pipeline timeline */}
            <GlassCard>
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-4">
                The pipeline
              </p>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {PIPELINE_STAGES.map((stage, i) => {
                  const reached =
                    existingApp &&
                    PIPELINE_STAGES.findIndex(
                      (s) => s.key === existingApp.stage,
                    ) >= i;
                  return (
                    <div
                      key={stage.key}
                      className="flex items-center gap-2 shrink-0"
                    >
                      <div
                        className={`px-3 py-2 rounded-xl ${
                          reached
                            ? "bg-brand-primary text-white shadow-brand-glow"
                            : "bg-white/60 border border-brand-ink/10 text-brand-muted"
                        }`}
                      >
                        <p className="text-xs font-semibold">{stage.label}</p>
                        <p
                          className={`text-[10px] ${
                            reached ? "text-white/80" : "text-brand-muted/80"
                          }`}
                        >
                          {job.slaHours}h SLA
                        </p>
                      </div>
                      {i < PIPELINE_STAGES.length - 1 && (
                        <div
                          className={`h-px w-6 ${
                            reached ? "bg-brand-primary/40" : "bg-brand-ink/10"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-brand-muted mt-3">
                Each stage has its own SLA. Miss any of them →{" "}
                <span className="text-brand-primary font-semibold">
                  application slot returned
                </span>{" "}
                (won&apos;t count against your limit) + recruiter ghost-rated.
              </p>
            </GlassCard>

            {/* About company */}
            <GlassCard>
              <div className="flex items-start justify-between gap-4 mb-3">
                <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
                  About {co?.name}
                </p>
                <Link
                  href={`/companies/${co?.id ?? ""}`}
                  className="text-xs font-semibold text-brand-primary hover:underline"
                >
                  Company profile →
                </Link>
              </div>
              <p className="text-sm text-brand-ink/85 leading-relaxed">
                {co?.description}
              </p>
              <div className="mt-4 rounded-2xl bg-white/40 border border-brand-ink/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                    Ghosting rate (90 days)
                  </p>
                  {hasGhostingSignal ? (
                    <span
                      className={`font-display font-bold text-lg ${
                        ghostingRatePct > 10
                          ? "text-rose-600"
                          : ghostingRatePct > 5
                            ? "text-amber-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {ghostingRatePct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-brand-muted">
                      not enough data
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-muted">
                  {hasGhostingSignal ? (
                    <>
                      Industry avg{" "}
                      <span className="text-brand-ink">38%</span> · lower is
                      better.
                    </>
                  ) : (
                    <>
                      Needs ≥5 applications in the last 90 days to compute a
                      stable rate.
                    </>
                  )}
                </p>
              </div>
            </GlassCard>

            {/* Similar missions */}
            {similar.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
                  Similar missions
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {similar.map((s) => (
                    <Link
                      key={s.job.id}
                      href={`/missions/${s.job.id}`}
                      className="block rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 p-4 hover:-translate-y-0.5 hover:shadow-glass-hover transition"
                    >
                      <p className="font-display font-semibold text-sm text-brand-ink line-clamp-1">
                        {s.job.title}
                      </p>
                      <p className="text-xs text-brand-muted mt-1">
                        ₹{s.job.salaryMin}–{s.job.salaryMax}L · {s.job.location}
                      </p>
                      <p className="text-[10px] text-brand-primary mt-2 font-semibold">
                        {s.overlap} shared skill{s.overlap === 1 ? "" : "s"}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Sticky right sidebar ───────────────────────────────────── */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-4">
              <GlassCard variant="strong" className="text-center !p-6">
                <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
                  Tier · your match
                </p>
                <p
                  className={`font-display font-extrabold text-5xl mt-1 ${
                    matchPct >= 80
                      ? "text-emerald-600"
                      : matchPct >= 60
                      ? "text-brand-primary"
                      : "text-amber-600"
                  }`}
                >
                  {matchPct}
                  <span className="text-2xl text-brand-muted">%</span>
                </p>
                <p className="text-sm text-brand-ink/80 mt-1 font-semibold">
                  Tier {tier.letter} · {tier.label}
                </p>

                {existingApp && existingApp.submitted === false ? (
                  // Failed a prior attempt — private to the student, retryable.
                  <div className="mt-5">
                    <GlassBadge tone="warn">Didn&apos;t pass yet</GlassBadge>
                    <p className="text-xs text-brand-muted mt-2">
                      Your last attempt scored{" "}
                      <span className="font-semibold text-brand-ink">
                        {existingApp.assessment?.grade?.score ?? "—"}/100
                      </span>
                      . It wasn&apos;t sent to the recruiter — retry when
                      you&apos;re ready.
                    </p>
                    <Link
                      href={`/missions/${job.id}/assess`}
                      className="btn-brand mt-3 w-full justify-center"
                      style={{ minHeight: 56 }}
                    >
                      <Target size={16} /> Retry assessment →
                    </Link>
                    <Link
                      href={`/student/applications/${existingApp.id}`}
                      className="text-xs text-brand-primary font-semibold mt-2 inline-block hover:underline"
                    >
                      View grade + Path Forward →
                    </Link>
                  </div>
                ) : existingApp ? (
                  <div className="mt-5">
                    <GlassBadge tone="success">
                      <CheckCircle2 size={11} /> Already applied
                    </GlassBadge>
                    <p className="text-xs text-brand-muted mt-2">
                      Current stage:{" "}
                      <span className="font-semibold text-brand-ink">
                        {existingApp.stage.replace("_", " ")}
                      </span>
                    </p>
                    <Link
                      href={`/student/applications/${existingApp.id}`}
                      className="text-xs text-brand-primary font-semibold mt-2 inline-block hover:underline"
                    >
                      Track status →
                    </Link>
                  </div>
                ) : quotaExhausted ? (
                  <>
                    <Link
                      href="/upgrade"
                      className="btn-brand mt-5 w-full justify-center"
                      style={{ minHeight: 56 }}
                    >
                      <Sparkles size={16} /> Upgrade to Apply →
                    </Link>
                    <p className="text-[11px] text-brand-muted mt-3">
                      You&apos;ve used all {applicationsLimit} free
                      applications. A paid plan unlocks unlimited.
                    </p>
                  </>
                ) : canApply ? (
                  <>
                    <Link
                      href={`/missions/${job.id}/assess`}
                      className="btn-brand mt-5 w-full justify-center"
                      style={{ minHeight: 56 }}
                    >
                      <Target size={16} /> Take Assessment to Apply →
                    </Link>
                    {/* Copy matches the actual flow: TOTAL_QUESTIONS=1 in
                        app/missions/[id]/assess/page.tsx. Bump this back to
                        "10 questions" the moment the gauntlet supports a
                        multi-question stream. */}
                    <p className="text-[11px] text-brand-muted mt-3">
                      ~5 mins · 1 scenario · 60% to pass
                    </p>
                  </>
                ) : (
                  <div className="mt-5 rounded-2xl bg-amber-500/5 border border-amber-500/30 p-4 text-left">
                    <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-2">
                      Profile too thin to apply
                    </p>
                    <div className="h-2 rounded-full bg-brand-ink/5 overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400"
                        style={{ width: `${completeness.pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-brand-ink/85 mb-3">
                      {completeness.pct}% of {APPLY_THRESHOLD}% required.
                      Recruiters can&apos;t weigh thin profiles — finish your
                      profile to unlock applications.
                    </p>
                    {completeness.missing.length > 0 && (
                      <ul className="space-y-1 mb-4">
                        {completeness.missing.slice(0, 3).map((m) => (
                          <li
                            key={m.key}
                            className="text-[11px] text-brand-ink/80 flex items-start gap-1.5"
                          >
                            <span className="text-amber-600 mt-0.5">▸</span>
                            {m.label}
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      href="/student/profile/edit"
                      className="btn-brand w-full justify-center"
                    >
                      Complete profile →
                    </Link>
                  </div>
                )}
              </GlassCard>

              {/* Quota */}
              {!existingApp && (
                <GlassCard className="!p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                      {unlimitedApps ? "Applications sent" : "Applications used"}
                    </p>
                    <span
                      className={`text-xs font-display font-bold ${
                        quotaTight ? "text-rose-600" : "text-brand-ink"
                      }`}
                    >
                      {unlimitedApps
                        ? applicationsUsed
                        : `${applicationsUsed} of ${applicationsLimit}`}
                    </span>
                  </div>
                  {!unlimitedApps && (
                    <div className="h-1.5 rounded-full bg-brand-ink/5 overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${
                          quotaTight
                            ? "bg-rose-500"
                            : "bg-gradient-to-r from-brand-primary to-brand-secondary"
                        }`}
                        style={{ width: `${quotaUsedPct}%` }}
                      />
                    </div>
                  )}
                  {unlimitedApps ? (
                    <p className="text-[11px] text-emerald-600 font-semibold">
                      Unlimited
                    </p>
                  ) : quotaTight ? (
                    <Link
                      href="/upgrade"
                      className="text-xs text-rose-600 font-semibold hover:underline"
                    >
                      Upgrade for unlimited →
                    </Link>
                  ) : (
                    <p className="text-[11px] text-brand-muted">
                      Free tier · {applicationsLimit} lifetime applications
                    </p>
                  )}
                </GlassCard>
              )}

              {/* Compatibility summary */}
              <GlassCard className="!p-4">
                <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-3">
                  Compatibility
                </p>
                <ul className="space-y-2 text-sm">
                  <Row
                    icon={<CheckCircle2 size={12} className="text-emerald-600" />}
                    label="Skills covered"
                    value={`${rows.filter((r) => r.has).length}/${rows.length}`}
                  />
                  <Row
                    icon={<Sparkles size={12} className="text-amber-600" />}
                    label="Verified badges"
                    value={rows.filter((r) => r.verified).length}
                  />
                  <Row
                    icon={<Trophy size={12} className="text-brand-primary" />}
                    label="Past roles"
                    value={user?.profile?.history?.length ?? 0}
                  />
                </ul>
              </GlassCard>

              {/* SLA promise */}
              <GlassCard
                glow
                className="!p-4 bg-emerald-500/5 border-emerald-500/20"
              >
                <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-2 flex items-center gap-1.5">
                  <Clock size={11} /> SLA promise
                </p>
                <p className="font-display font-extrabold text-2xl text-brand-ink">
                  {job.slaHours}
                  <span className="text-base text-brand-muted">h</span>
                </p>
                <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                  {co?.name} commits to a real answer in{" "}
                  <span className="text-emerald-700 font-semibold">
                    {job.slaHours} hours
                  </span>{" "}
                  per pipeline stage. Miss it → your application slot is
                  returned (won&apos;t count against your limit).
                </p>
              </GlassCard>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function KeyFact({
  icon,
  label,
  value,
  tone = "brand",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "brand" | "success" | "warn" | "danger";
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
    <div>
      <p
        className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold ${cls}`}
      >
        {icon}
        {label}
      </p>
      <p className="text-sm font-display font-bold text-brand-ink mt-1">
        {value}
      </p>
    </div>
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
