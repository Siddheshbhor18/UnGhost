"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Application, Job, Stage, User } from "@/shared/types";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import { slaCountdown } from "@/shared/lib/sla";
import {
  X,
  ChevronRight,
  Award,
  Brain,
  Sparkles,
  CheckCircle2,
  User as UserIcon,
  ClipboardList,
  Activity,
  AlertTriangle,
  TrendingUp,
  GraduationCap,
  MessageCircle,
} from "lucide-react";
import clsx from "clsx";
import { SponsorBootcampModal } from "@/components/recruiter/SponsorBootcampModal";
import { MessageThread } from "@/components/shared/MessageThread";

interface Props {
  applications: Application[];
  jobs: Record<string, Job>;
  students: Record<string, User>;
}

const LANES: Array<{ stage: Stage; label: string; accent: string }> = [
  { stage: "new_matches", label: "New Matches", accent: "text-brand-primary" },
  { stage: "under_review", label: "Under Review", accent: "text-amber-600" },
  { stage: "interview", label: "Interview", accent: "text-violet-600" },
  { stage: "offer", label: "Offer", accent: "text-emerald-600" },
];

export function KanbanBoard({ applications, jobs, students }: Props) {
  const [apps, setApps] = useState(applications);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hiredAppName, setHiredAppName] = useState<string | null>(null);
  const [hiredAppId, setHiredAppId] = useState<string | null>(null);
  const [initialDrawerTab, setInitialDrawerTab] = useState<DrawerTab>("profile");

  const byStage = useMemo(() => {
    const m: Record<Stage, Application[]> = {
      new_matches: [],
      under_review: [],
      interview: [],
      offer: [],
      hired: [],
      rejected: [],
    };
    for (const a of apps) m[a.stage].push(a);
    return m;
  }, [apps]);

  async function advance(id: string, next: Stage, notes?: string) {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, stage: next, outcomeNotes: notes ?? a.outcomeNotes } : a)),
    );
    await fetch(`/api/applications/${id}/stage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stage: next, outcomeNotes: notes }),
    });
    setOpenId(null);

    if (next === "hired") {
      const targetApp = apps.find((a) => a.id === id);
      const studentName = targetApp ? students[targetApp.studentId]?.name : "the candidate";
      setHiredAppName(studentName || "the candidate");
      setHiredAppId(id);
    }
  }

  const open = apps.find((a) => a.id === openId);

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {LANES.map((lane) => (
          <div key={lane.stage}>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className={`font-display text-sm font-semibold ${lane.accent}`}>
                {lane.label}
              </p>
              <GlassBadge tone="neutral">{byStage[lane.stage].length}</GlassBadge>
            </div>
            <div className="space-y-3 min-h-[200px]">
              <AnimatePresence>
                {byStage[lane.stage].map((a) => (
                  <CandidateCard
                    key={a.id}
                    app={a}
                    job={jobs[a.jobId]}
                    student={students[a.studentId]}
                    onOpen={() => {
                      setInitialDrawerTab("profile");
                      setOpenId(a.id);
                    }}
                  />
                ))}
              </AnimatePresence>
              {byStage[lane.stage].length === 0 && (
                <div className="rounded-2xl border border-dashed border-brand-ink/15 p-6 text-center bg-white/30 backdrop-blur-sm">
                  <p className="text-xs text-brand-muted">empty lane</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {open && (
          <ActionDrawer
            app={open}
            job={jobs[open.jobId]}
            student={students[open.studentId]}
            allApps={apps}
            allStudents={students}
            onClose={() => setOpenId(null)}
            onAdvance={(stage, notes) => advance(open.id, stage, notes)}
            initialTab={initialDrawerTab}
          />
        )}
      </AnimatePresence>

      {/* Congratulations Modal */}
      <AnimatePresence>
        {hiredAppId && hiredAppName && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-brand-ink/40 backdrop-blur-md"
              onClick={() => {
                setHiredAppId(null);
                setHiredAppName(null);
              }}
            />
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md glass-panel p-8 text-center bg-white/95 backdrop-blur-2xl border border-white/60 shadow-glass-xl rounded-3xl"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
                <Sparkles size={28} />
              </div>

              <h3 className="font-display text-xl font-bold text-brand-ink mb-2">
                Congrats on finding your ideal candidate!
              </h3>
              <p className="text-sm text-brand-muted mb-6">
                Let <span className="font-semibold text-brand-primary">{hiredAppName}</span> know that they got hired.
              </p>

              <div className="flex gap-3 justify-center">
                <GlassButton
                  variant="brand"
                  size="md"
                  onClick={() => {
                    setInitialDrawerTab("messages");
                    setOpenId(hiredAppId);
                    setHiredAppId(null);
                    setHiredAppName(null);
                  }}
                >
                  <MessageCircle size={14} className="mr-1.5" />
                  Message
                </GlassButton>
                <GlassButton
                  variant="glass"
                  size="md"
                  onClick={() => {
                    setHiredAppId(null);
                    setHiredAppName(null);
                  }}
                >
                  I&apos;ll do it later
                </GlassButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function CandidateCard({
  app,
  job,
  student,
  onOpen,
}: {
  app: Application;
  job?: Job;
  student?: User;
  onOpen: () => void;
}) {
  const sla = slaCountdown(app.slaDeadline);
  const verified = (student?.profile?.verifiedSkills?.length ?? 0) > 0;
  const veteran = (student?.profile?.history?.length ?? 0) >= 2;
  const matchTone =
    app.matchPct >= 80 ? "text-emerald-600" : app.matchPct >= 60 ? "text-brand-primary" : "text-brand-muted";
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onOpen}
      className={`w-full text-left glass-panel p-4 transition hover:-translate-y-0.5 hover:shadow-glass-hover ${
        sla.pulse && !sla.expired ? "ring-2 ring-amber-400/50" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-display text-sm font-semibold text-brand-ink truncate">
          {student?.name ?? "—"}
        </p>
        <span className={`font-display text-sm font-bold ${matchTone}`}>{app.matchPct}%</span>
      </div>
      <p className="text-xs text-brand-muted truncate mb-3">{job?.title}</p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {veteran && (
          <GlassBadge tone="brand">
            <Award size={10} /> Veteran
          </GlassBadge>
        )}
        {verified && (
          <GlassBadge tone="success">
            <Sparkles size={10} /> Verified
          </GlassBadge>
        )}
        {app.assessment?.grade && (
          <GlassBadge
            tone={
              app.assessment.grade.score >= 75
                ? "success"
                : app.assessment.grade.score >= 55
                ? "warn"
                : "danger"
            }
          >
            <Brain size={10} /> {app.assessment.grade.score}
          </GlassBadge>
        )}
      </div>
      <p
        className={`text-[10px] font-semibold uppercase tracking-wider ${
          sla.expired ? "text-rose-600" : sla.pulse ? "text-amber-600" : "text-brand-muted"
        }`}
      >
        SLA {sla.label}
      </p>
    </motion.button>
  );
}

type DrawerTab = "profile" | "assessment" | "ai" | "messages" | "activity";

function ActionDrawer({
  app,
  job,
  student,
  allApps,
  allStudents,
  onClose,
  onAdvance,
  initialTab = "profile",
}: {
  app: Application;
  job?: Job;
  student?: User;
  allApps: Application[];
  allStudents: Record<string, User>;
  onClose: () => void;
  onAdvance: (stage: Stage, notes?: string) => void;
  initialTab?: DrawerTab;
}) {
  const [tab, setTab] = useState<DrawerTab>(initialTab);
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [sponsorBanner, setSponsorBanner] = useState<string | null>(null);
  const next: Stage =
    app.stage === "new_matches"
      ? "under_review"
      : app.stage === "under_review"
      ? "interview"
      : app.stage === "interview"
      ? "offer"
      : "hired";

  // ── AI Analysis pre-computation (per PRD: pre-computed at assessment submit,
  //     stored on application.aiAnalysis. Here we derive synchronously.)
  const sameJobApps = allApps.filter((a) => a.jobId === app.jobId);
  const matchSorted = [...sameJobApps].sort((a, b) => b.matchPct - a.matchPct);
  const gradeSorted = [...sameJobApps].sort(
    (a, b) =>
      (b.assessment?.grade?.score ?? 0) - (a.assessment?.grade?.score ?? 0),
  );
  const matchRank = matchSorted.findIndex((a) => a.id === app.id) + 1;
  const gradeRank = gradeSorted.findIndex((a) => a.id === app.id) + 1;

  const requiredSkills = new Set(
    (job?.skills ?? []).map((s) => s.toLowerCase()),
  );
  const studentSkillsLower = new Set(
    (student?.profile?.skills ?? []).map((s) => s.toLowerCase()),
  );
  const strengths = [...requiredSkills].filter((s) =>
    studentSkillsLower.has(s),
  );
  const gaps = [...requiredSkills].filter((s) => !studentSkillsLower.has(s));
  const verifiedCount = student?.profile?.verifiedSkills?.length ?? 0;
  const historyCount = student?.profile?.history?.length ?? 0;

  // Risk flags
  const riskFlags: string[] = [];
  if (historyCount >= 4) {
    const avgTenure =
      student?.profile?.history?.reduce((sum, h) => {
        const start = new Date(h.startDate).getTime();
        const end = h.endDate ? new Date(h.endDate).getTime() : Date.now();
        return sum + (end - start) / (1000 * 60 * 60 * 24 * 365);
      }, 0) ?? 0;
    if (avgTenure / historyCount < 1.2) {
      riskFlags.push("Average tenure under 1.2 years — possible job-hopping.");
    }
  }
  if ((app.assessment?.integrityScore ?? 100) < 70) {
    riskFlags.push("Integrity score below 70 — paste/tab-switch flags raised.");
  }

  const confidence = Math.min(
    100,
    Math.round(
      app.matchPct * 0.6 +
        (app.assessment?.grade?.score ?? 50) * 0.3 +
        verifiedCount * 5,
    ),
  );

  return (
    <motion.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-brand-ink/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white/85 backdrop-blur-2xl border-l border-white/60 shadow-glass-lg overflow-y-auto"
      >
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-brand-ink/5 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
                Candidate Profile
              </p>
              <p className="font-display text-xl font-bold text-brand-ink mt-1">
                {student?.name}
              </p>
              <p className="text-xs text-brand-muted">{job?.title}</p>
            </div>
            <button
              onClick={onClose}
              className="text-brand-muted hover:text-rose-600 transition"
            >
              <X size={22} />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 -mb-1">
            <DrawerTabBtn
              active={tab === "profile"}
              onClick={() => setTab("profile")}
              icon={<UserIcon size={13} />}
              label="Profile"
            />
            <DrawerTabBtn
              active={tab === "assessment"}
              onClick={() => setTab("assessment")}
              icon={<ClipboardList size={13} />}
              label="Assessment"
            />
            <DrawerTabBtn
              active={tab === "ai"}
              onClick={() => setTab("ai")}
              icon={<Brain size={13} />}
              label="AI Analysis"
              badge="★"
            />
            <DrawerTabBtn
              active={tab === "messages"}
              onClick={() => setTab("messages")}
              icon={<MessageCircle size={13} />}
              label="Messages"
            />
            <DrawerTabBtn
              active={tab === "activity"}
              onClick={() => setTab("activity")}
              icon={<Activity size={13} />}
              label="Activity"
            />
          </div>
        </div>

        <div className="p-6 pb-28 space-y-6">
          {tab === "profile" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Match" value={`${app.matchPct}%`} tone="brand" />
                <Stat
                  label="Grade"
                  value={app.assessment?.grade?.score ?? "—"}
                  tone="success"
                />
                <Stat
                  label="Depth"
                  value={app.assessment?.grade?.depthSignal ?? "—"}
                  tone="warn"
                />
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
                  About
                </p>
                <p className="text-sm text-brand-ink/90 leading-relaxed">
                  {student?.profile?.alias} · {student?.profile?.city ?? "—"} ·{" "}
                  {student?.profile?.skills?.slice(0, 6).join(", ")}
                </p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
                  Skills
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(student?.profile?.skills ?? []).map((s) => (
                    <GlassBadge
                      key={s}
                      tone={
                        student?.profile?.verifiedSkills?.includes(s)
                          ? "success"
                          : "neutral"
                      }
                    >
                      {student?.profile?.verifiedSkills?.includes(s) && (
                        <CheckCircle2 size={9} />
                      )}{" "}
                      {s}
                    </GlassBadge>
                  ))}
                </div>
              </div>

              {(student?.profile?.history?.length ?? 0) > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
                    Work history
                  </p>
                  <ul className="space-y-2">
                    {student?.profile?.history?.map((h) => (
                      <li
                        key={h.id}
                        className="border-l-2 border-brand-primary/30 pl-3"
                      >
                        <p className="text-sm font-semibold text-brand-ink">
                          {h.title} · {h.company}
                        </p>
                        <p className="text-[11px] text-brand-muted">
                          {h.startDate} → {h.endDate}
                        </p>
                        <p className="text-xs text-brand-ink/80 mt-1 leading-relaxed">
                          {h.impact}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {tab === "assessment" &&
            (app.assessment ? (
              <div className="grid md:grid-cols-2 gap-3">
                <GlassCard className="!p-4">
                  <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-2">
                    Candidate Response
                  </p>
                  <p className="text-sm text-brand-ink whitespace-pre-wrap leading-relaxed">
                    {app.assessment.response}
                  </p>
                </GlassCard>
                <GlassCard className="!p-4" glow>
                  <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2">
                    AI Grading Notes
                  </p>
                  <p className="text-sm text-brand-ink leading-relaxed">
                    {app.assessment.grade?.notes}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <p className="text-xs text-brand-muted">
                      Verdict:{" "}
                      <span className="text-emerald-700 font-semibold">
                        {app.assessment.grade?.verdict?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  {app.assessment.integrityScore !== undefined && (
                    <p className="text-xs text-brand-muted mt-2">
                      Integrity signal:{" "}
                      <span
                        className={
                          app.assessment.integrityScore >= 80
                            ? "text-emerald-600 font-semibold"
                            : "text-rose-600 font-semibold"
                        }
                      >
                        {app.assessment.integrityScore}/100
                      </span>
                      <span className="text-brand-muted/70">
                        {" "}· self-reported
                      </span>
                    </p>
                  )}
                  {/* Proctoring counts — surfaced so recruiters can judge
                      assessment integrity (tab-switching / pasting). */}
                  {(app.assessment.tabSwitches !== undefined ||
                    app.assessment.pasteAttempts !== undefined) && (
                    <div className="mt-3 pt-3 border-t border-brand-ink/5">
                      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
                        Proctoring
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <ProctorStat
                          label="Tab switches"
                          value={app.assessment.tabSwitches ?? 0}
                          warn={(app.assessment.tabSwitches ?? 0) > 0}
                        />
                        <ProctorStat
                          label="Paste attempts"
                          value={app.assessment.pasteAttempts ?? 0}
                          warn={(app.assessment.pasteAttempts ?? 0) > 0}
                        />
                        {app.assessment.timeTakenSec !== undefined && (
                          <ProctorStat
                            label="Time taken"
                            value={`${Math.floor(
                              app.assessment.timeTakenSec / 60,
                            )}m ${app.assessment.timeTakenSec % 60}s`}
                            warn={app.assessment.timeTakenSec < 60}
                          />
                        )}
                      </div>
                      {app.assessment.integrityFlags &&
                        app.assessment.integrityFlags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {app.assessment.integrityFlags.map((f) => (
                              <span
                                key={f}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 font-medium"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  )}
                </GlassCard>
              </div>
            ) : (
              <GlassCard className="text-center !py-10">
                <p className="text-sm text-brand-muted">
                  No assessment submitted yet — likely a passive applicant or
                  database-search hit.
                </p>
              </GlassCard>
            ))}

          {tab === "ai" && (
            <div className="space-y-4">
              {/* Fit summary */}
              <GlassCard glow className="!p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
                    <Brain size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
                      AI Fit Summary
                    </p>
                    <p className="text-sm text-brand-ink leading-relaxed mt-1">
                      {student?.name?.split(" ")[0]} brings{" "}
                      <span className="font-semibold">{strengths.length}</span>{" "}
                      of {requiredSkills.size} required skills, with{" "}
                      <span className="font-semibold">{verifiedCount}</span>{" "}
                      verified-bootcamp badge{verifiedCount === 1 ? "" : "s"}.
                      Match {app.matchPct}% places them{" "}
                      <span className="font-semibold text-brand-primary">
                        #{matchRank} of {sameJobApps.length}
                      </span>{" "}
                      in this pipeline by relevance.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-brand-ink/5">
                  <span className="text-[10px] uppercase tracking-wider text-brand-muted">
                    AI Confidence
                  </span>
                  <span className="font-display font-bold text-brand-primary">
                    {confidence}%
                  </span>
                </div>
              </GlassCard>

              {/* Strengths */}
              <GlassCard className="!p-5">
                <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-3 flex items-center gap-1.5">
                  <Sparkles size={12} /> Strengths
                </p>
                {strengths.length > 0 ? (
                  <ul className="space-y-2">
                    {strengths.slice(0, 5).map((s) => (
                      <li
                        key={s}
                        className="flex items-start gap-2 text-sm text-brand-ink"
                      >
                        <CheckCircle2
                          size={14}
                          className="text-emerald-600 mt-0.5 shrink-0"
                        />
                        <span>
                          <span className="capitalize font-semibold">{s}</span>
                          {student?.profile?.verifiedSkills?.some(
                            (v) => v.toLowerCase() === s,
                          ) && (
                            <span className="ml-2 text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">
                              · Verified
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-brand-muted">
                    No direct skill overlap detected.
                  </p>
                )}
              </GlassCard>

              {/* Gaps */}
              {gaps.length > 0 && (
                <GlassCard className="!p-5">
                  <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-3 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Gaps
                  </p>
                  <ul className="space-y-2">
                    {gaps.slice(0, 3).map((s) => (
                      <li
                        key={s}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="text-brand-ink capitalize">{s}</span>
                        <button
                          onClick={() => setSponsorOpen(true)}
                          className="text-[11px] font-semibold text-brand-primary hover:underline"
                        >
                          Sponsor Bootcamp →
                        </button>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}

              {/* Comparative ranking */}
              <GlassCard className="!p-5">
                <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
                  <TrendingUp size={12} /> Comparative Ranking
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <RankCell
                    label="By match"
                    rank={matchRank}
                    total={sameJobApps.length}
                  />
                  <RankCell
                    label="By assessment"
                    rank={gradeRank}
                    total={sameJobApps.length}
                  />
                </div>
              </GlassCard>

              {/* Risk flags */}
              {riskFlags.length > 0 && (
                <GlassCard className="!p-5 bg-rose-50/40">
                  <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold mb-3 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Risk Flags
                  </p>
                  <ul className="space-y-1.5">
                    {riskFlags.map((r, i) => (
                      <li
                        key={i}
                        className="text-sm text-rose-800 leading-relaxed"
                      >
                        · {r}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              )}
            </div>
          )}

          {tab === "messages" &&
            (["new_matches", "rejected"].includes(app.stage) ? (
              <GlassCard className="!p-6 text-center">
                <MessageCircle
                  size={24}
                  className="mx-auto text-brand-muted mb-2"
                />
                <p className="text-sm font-display font-semibold text-brand-ink">
                  Advance past Stage 1 to unlock messaging
                </p>
                <p className="text-xs text-brand-muted mt-1">
                  Keeps cold-pipeline noise out of the candidate&apos;s inbox.
                </p>
              </GlassCard>
            ) : (
              <MessageThread applicationId={app.id} />
            ))}

          {tab === "activity" && (
            <GlassCard className="!p-5">
              <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-4">
                Activity Log
              </p>
              <ul className="space-y-3">
                <ActivityRow
                  ts={new Date(app.createdAt).toLocaleString("en-IN")}
                  label="Application submitted"
                />
                {app.assessment && (
                  <ActivityRow
                    ts={new Date(app.assessment.submittedAt).toLocaleString(
                      "en-IN",
                    )}
                    label={`Assessment graded — ${app.assessment.grade?.score ?? "?"}/100`}
                  />
                )}
                <ActivityRow
                  ts={new Date().toLocaleDateString("en-IN")}
                  label={`Currently in stage: ${app.stage.replace("_", " ")}`}
                />
                {app.interviewScheduledAt && (
                  <ActivityRow
                    ts={new Date(app.interviewScheduledAt).toLocaleString(
                      "en-IN",
                    )}
                    label="Interview scheduled"
                  />
                )}
                {app.outcomeNotes && (
                  <ActivityRow ts="latest" label={app.outcomeNotes} />
                )}
              </ul>
            </GlassCard>
          )}
        </div>

        {/* Sticky bottom action bar */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-brand-ink/5 px-6 py-4 flex flex-wrap gap-2">
          <GlassButton variant="brand" size="md" onClick={() => onAdvance(next)}>
            <ChevronRight size={14} /> Advance to{" "}
            {next === "under_review"
              ? "Review"
              : next === "interview"
              ? "Interview"
              : next === "offer"
              ? "Offer"
              : "Hire"}
          </GlassButton>
          <GlassButton
            variant="glass"
            size="md"
            onClick={() => onAdvance("rejected", "Rejected with AI feedback")}
          >
            Reject with Feedback
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="md"
            onClick={() => setSponsorOpen(true)}
          >
            <GraduationCap size={14} /> Sponsor Bootcamp
          </GlassButton>
        </div>

        {/* Sponsor success banner */}
        {sponsorBanner && (
          <div className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-xl p-4 shadow-glass-lg flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-800 leading-relaxed flex-1">
              {sponsorBanner}
            </p>
            <button
              onClick={() => setSponsorBanner(null)}
              className="text-emerald-700/70 hover:text-emerald-700"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </motion.div>

      {sponsorOpen && student && (
        <SponsorBootcampModal
          student={student}
          job={job}
          onClose={() => setSponsorOpen(false)}
          onComplete={() => {
            setSponsorOpen(false);
            setSponsorBanner(
              `Sponsorship offered to ${student.name}. They have 30 days to accept.`,
            );
          }}
        />
      )}
    </motion.div>
  );
}

function DrawerTabBtn({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-xs font-semibold transition border-b-2",
        active
          ? "text-brand-primary border-brand-primary bg-white/40"
          : "text-brand-muted border-transparent hover:text-brand-ink",
      )}
    >
      {icon}
      {label}
      {badge && <span className="text-amber-500 text-[10px]">{badge}</span>}
    </button>
  );
}

function RankCell({
  label,
  rank,
  total,
}: {
  label: string;
  rank: number;
  total: number;
}) {
  const isTop = rank <= Math.ceil(total / 3);
  return (
    <div className="bg-white/50 rounded-xl border border-brand-ink/5 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wider text-brand-muted mb-1">
        {label}
      </p>
      <p
        className={`font-display font-bold text-2xl ${
          isTop ? "text-emerald-600" : "text-brand-primary"
        }`}
      >
        #{rank}
        <span className="text-sm text-brand-muted font-medium ml-1">
          of {total}
        </span>
      </p>
    </div>
  );
}

function ActivityRow({ ts, label }: { ts: string; label: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2 shrink-0" />
      <div>
        <p className="text-sm text-brand-ink">{label}</p>
        <p className="text-[10px] text-brand-muted font-mono">{ts}</p>
      </div>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "brand" | "success" | "warn";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : "text-brand-primary";
  return (
    <div className="glass-panel !p-4 text-center">
      <p className="text-[10px] uppercase tracking-wider text-brand-muted mb-1">
        {label}
      </p>
      <p className={`font-display text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  );
}

function ProctorStat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string | number;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-2.5 py-1.5 border ${
        warn
          ? "bg-rose-500/10 border-rose-500/20"
          : "bg-emerald-500/10 border-emerald-500/20"
      }`}
    >
      <p className="text-[9px] uppercase tracking-wider text-brand-muted">
        {label}
      </p>
      <p
        className={`text-sm font-bold ${
          warn ? "text-rose-600" : "text-emerald-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
