import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { GlassBadge, GlassCard } from "@/components/glass";
import { authOptions } from "@/server/auth";
import {
  getUserById,
  listApplicationsByStudent,
  listBootcamps,
  listJobs,
  listCompanies,
} from "@/server/store";
import { UserActionsCard } from "@/components/admin/UserActionsCard";
import {
  ArrowLeft,
  Calendar,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Briefcase,
  PlayCircle,
  Award,
} from "lucide-react";

const PHASE_ORDER = ["new_matches", "under_review", "interview", "offer", "hired"];
const PHASE_LABEL: Record<string, string> = {
  new_matches: "Matched",
  under_review: "Under Review",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
};

export default async function StudentDeepView({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const u = await getUserById(params.id);
  if (!u || u.role !== "student") notFound();

  const [apps, allJobs, allCo, allBC] = await Promise.all([
    listApplicationsByStudent(u.id),
    listJobs(),
    listCompanies(),
    listBootcamps(),
  ]);
  const enrolledBC = allBC.filter((b) => b.enrolledStudentIds.includes(u.id));

  // Highest phase reached
  const currentPhase = apps.reduce<string>((best, a) => {
    const r1 = PHASE_ORDER.indexOf(a.stage);
    const r2 = PHASE_ORDER.indexOf(best);
    return r1 > r2 ? a.stage : best;
  }, "new_matches");
  const phaseIdx = PHASE_ORDER.indexOf(currentPhase);

  // Total video count across enrolled bootcamps (mock watch progress)
  const totalVideos = enrolledBC.reduce((s, b) => s + b.videos.length, 0);
  const watchedVideos = Math.min(
    totalVideos,
    u.profile?.verifiedSkills.length
      ? Math.round(totalVideos * 0.7)
      : Math.round(totalVideos * 0.35),
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <Link
        href="/admin/students"
        className="inline-flex items-center gap-1.5 text-sm text-brand-primary hover:text-brand-secondary"
      >
        <ArrowLeft size={14} /> Back to roster
      </Link>

      {/* Interview-phase funnel */}
      <GlassCard>
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-4">
          Interview Phase · Highest Reached
        </p>
        <div className="flex items-center gap-2 overflow-x-auto">
          {PHASE_ORDER.map((p, i) => {
            const reached = i <= phaseIdx;
            const isCurrent = i === phaseIdx;
            return (
              <div key={p} className="flex items-center gap-2 shrink-0">
                <div
                  className={`px-3 py-2 rounded-xl text-xs font-semibold ${
                    isCurrent
                      ? "bg-brand-primary text-white shadow-brand-glow"
                      : reached
                      ? "bg-brand-primary/15 text-brand-primary"
                      : "bg-brand-ink/5 text-brand-muted"
                  }`}
                >
                  {PHASE_LABEL[p]}
                </div>
                {i < PHASE_ORDER.length - 1 && (
                  <div
                    className={`h-px w-8 ${
                      reached ? "bg-brand-primary/40" : "bg-brand-ink/10"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Admin moderation actions */}
      {session?.user?.id && (
        <UserActionsCard user={u} currentAdminId={session.user.id} />
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Profile column */}
        <GlassCard className="lg:col-span-1 space-y-4">
          <div>
            <GlassBadge tone="brand">Student</GlassBadge>
            <h1 className="font-display text-2xl font-bold text-brand-ink mt-2">{u.name}</h1>
            <p className="text-sm text-brand-muted">{u.profile?.alias}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2 text-brand-ink">
              <Mail size={14} className="text-brand-primary" /> {u.profile?.contactEmail}
            </p>
            {u.profile?.contactPhone && (
              <p className="flex items-center gap-2 text-brand-ink">
                <Phone size={14} className="text-brand-primary" /> {u.profile.contactPhone}
              </p>
            )}
            {u.profile?.city && (
              <p className="flex items-center gap-2 text-brand-ink">
                <MapPin size={14} className="text-brand-primary" /> {u.profile.city} ·{" "}
                {u.profile.remotePref}
              </p>
            )}
            <p className="flex items-center gap-2 text-brand-ink">
              <Calendar size={14} className="text-brand-primary" /> Joined{" "}
              {new Date(u.profile?.joinedAt ?? "").toLocaleDateString("en-IN")}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
              Trajectory
            </p>
            <GlassBadge
              tone={
                u.profile?.trajectory === "actively_hunting" ? "success" : "brand"
              }
            >
              {u.profile?.trajectory?.replace("_", " ")}
            </GlassBadge>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {u.profile?.skills.map((s: string) => (
                <GlassBadge
                  key={s}
                  tone={u.profile?.verifiedSkills.includes(s) ? "success" : "neutral"}
                >
                  {u.profile?.verifiedSkills.includes(s) && <ShieldCheck size={10} />} {s}
                </GlassBadge>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Activity */}
        <div className="lg:col-span-2 space-y-5">
          {/* Video watch progress */}
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold flex items-center gap-2">
                <PlayCircle size={14} /> Video Watch Progress
              </p>
              <span className="text-sm font-semibold text-brand-ink">
                {watchedVideos} / {totalVideos || 0}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-brand-ink/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary"
                style={{
                  width: totalVideos ? `${(watchedVideos / totalVideos) * 100}%` : "0%",
                }}
              />
            </div>
            <p className="text-xs text-brand-muted mt-2">
              {totalVideos
                ? `${Math.round((watchedVideos / totalVideos) * 100)}% across ${
                    enrolledBC.length
                  } enrolled bootcamp${enrolledBC.length === 1 ? "" : "s"}`
                : "No bootcamps enrolled yet."}
            </p>
          </GlassCard>

          <GlassCard>
            <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-3 flex items-center gap-2">
              <GraduationCap size={14} /> Bootcamp Enrollment
            </p>
            {enrolledBC.length === 0 ? (
              <p className="text-sm text-brand-muted">Not enrolled in any bootcamps yet.</p>
            ) : (
              <ul className="space-y-2">
                {enrolledBC.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between bg-white/40 rounded-xl px-4 py-3 border border-brand-ink/5"
                  >
                    <div>
                      <p className="font-display text-sm font-semibold text-brand-ink">
                        {b.title}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {b.skill} · {b.durationWeeks}w · ₹
                        {b.priceINR.toLocaleString("en-IN")}
                      </p>
                    </div>
                    {u.profile?.verifiedSkills.includes(b.skill) && (
                      <GlassBadge tone="success">
                        <Sparkles size={10} /> Verified
                      </GlassBadge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard>
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-2">
              <Briefcase size={14} /> Applications · {apps.length}
            </p>
            {apps.length === 0 ? (
              <p className="text-sm text-brand-muted">
                No applications submitted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {apps.map((a) => {
                  const j = allJobs.find((x) => x.id === a.jobId);
                  const co = allCo.find((x) => x.id === j?.companyId);
                  return (
                    <div
                      key={a.id}
                      className="bg-white/40 rounded-xl p-4 border border-brand-ink/5"
                    >
                      <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                        <div>
                          <p className="font-display text-sm font-semibold text-brand-ink">
                            {j?.title}
                          </p>
                          <p className="text-xs text-brand-muted">
                            {co?.name} · applied{" "}
                            {new Date(a.createdAt).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          <GlassBadge tone="brand">Match {a.matchPct}%</GlassBadge>
                          <GlassBadge
                            tone={
                              a.stage === "rejected"
                                ? "danger"
                                : a.stage === "offer" || a.stage === "hired"
                                ? "success"
                                : "warn"
                            }
                          >
                            {a.stage.replace("_", " ")}
                          </GlassBadge>
                        </div>
                      </div>
                      {a.assessment?.grade && (
                        <p className="text-xs text-brand-muted leading-relaxed">
                          <span className="text-amber-700 font-semibold">
                            Grade {a.assessment.grade.score}
                          </span>{" "}
                          · {a.assessment.grade.notes}
                        </p>
                      )}
                      {a.interviewScheduledAt && (
                        <p className="text-xs text-violet-600 font-semibold mt-1">
                          Interview ·{" "}
                          {new Date(a.interviewScheduledAt).toLocaleString("en-IN")}
                        </p>
                      )}
                      {a.outcomeNotes && (
                        <p className="text-xs text-brand-muted mt-1">
                          ▸ {a.outcomeNotes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-2">
              <Award size={14} /> Work History
            </p>
            <div className="space-y-3">
              {u.profile?.history.map((h) => (
                <div
                  key={h.id}
                  className="border-l-2 border-brand-primary/40 pl-4"
                >
                  <p className="font-display text-sm font-semibold text-brand-ink">
                    {h.title} · {h.company}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {h.startDate} → {h.endDate}
                  </p>
                  <p className="text-sm text-brand-ink/90 mt-1 leading-relaxed">
                    {h.impact}
                  </p>
                </div>
              ))}
              {(!u.profile?.history || u.profile.history.length === 0) && (
                <p className="text-sm text-brand-muted">No work history on file.</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
