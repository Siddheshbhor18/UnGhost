"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Eye,
  Ghost,
  GraduationCap,
  Pause,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassNavbar,
  Logo,
} from "@/components/glass";
import { depthScore } from "@/server/lib/matching";
import type { Job, Bootcamp, AssessmentGrade } from "@/shared/types";
import clsx from "clsx";

type Phase = "loading" | "briefing" | "focus" | "submitting" | "success" | "failure";

interface FailurePayload {
  grade?: AssessmentGrade;
  recommendedBootcamps: Bootcamp[];
  studentSkills: string[];
  missingSkills: string[];
}

const TOTAL_QUESTIONS = 1; // single scenario per current backend
const SOFT_LIMIT_SEC = 20 * 60; // 20 min — UI cue only

export default function AssessmentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [job, setJob] = useState<Job | null>(null);
  const [response, setResponse] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pauseUsed, setPauseUsed] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [pasteAttempts, setPasteAttempts] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [failure, setFailure] = useState<FailurePayload | null>(null);
  const [consents, setConsents] = useState({ truth: false, ownWork: false, integrity: false });
  const startedAtRef = useRef<number>(Date.now());

  // ── Load job + check profile completeness (PRD: 60% gate) ────────
  useEffect(() => {
    (async () => {
      try {
        const [jobRes, profRes, quotaRes, appsRes] = await Promise.all([
          fetch(`/api/jobs/${params.id}`),
          fetch("/api/student/profile"),
          fetch("/api/applications/quota"),
          fetch("/api/applications"),
        ]);
        // Is this a retry of a failed (unsubmitted) attempt for THIS job?
        // Retries don't create a new submitted application, so they're exempt
        // from the quota gate (the apply POST exempts them server-side too).
        let isRetry = false;
        try {
          if (appsRes.ok) {
            const apps = await appsRes.json();
            isRetry =
              Array.isArray(apps) &&
              apps.some(
                (a: { jobId: string; submitted?: boolean }) =>
                  a.jobId === params.id && a.submitted === false,
              );
          }
        } catch {
          /* ignore — treat as non-retry */
        }
        // Quota gate: a free student who has used all their (submitted)
        // applications can't apply, so they can't take a NEW assessment —
        // send them to upgrade. Fail open: only redirect on an explicit "no".
        try {
          if (!isRetry && quotaRes.ok) {
            const q = await quotaRes.json();
            if (q && q.allowed === false) {
              router.replace("/upgrade?to=premium");
              return;
            }
          }
        } catch {
          /* fail open — the apply POST still enforces the cap server-side */
        }
        if (profRes.ok) {
          // Inline check — mirrors server-side computeCompleteness
          const me = await profRes.json();
          const p = me.profile;
          if (p) {
            const required = [
              !!p.alias,
              (p.skills?.length ?? 0) > 0,
              (p.history?.length ?? 0) > 0,
              !!p.city,
              !!p.contactPhone,
              (p.verifiedSkills?.length ?? 0) > 0,
              (p.enrolledBootcamps?.length ?? 0) > 0,
            ];
            const weights = [10, 20, 20, 10, 10, 15, 15];
            let earned = 0;
            required.forEach((ok, i) => {
              if (ok) earned += weights[i];
            });
            if (earned < 60) {
              router.replace(`/missions/${params.id}?reason=incomplete`);
              return;
            }
          }
        }
        const j = await jobRes.json();
        setJob(j);
        setPhase("briefing");
      } catch {
        setPhase("briefing");
      }
    })();
  }, [params.id, router]);

  // ── Soft timer (only ticks during focus + not paused) ─────────────
  useEffect(() => {
    if (phase !== "focus" || paused) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase, paused]);

  // ── Tab switch detection ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== "focus") return;
    function onVisibility() {
      if (document.hidden) {
        setTabSwitches((n) => {
          const next = n + 1;
          if (next === 1)
            setWarning("Heads up — you switched tabs. The recruiter sees this.");
          if (next >= 3)
            setWarning(
              "Three+ tab switches recorded. Integrity score will drop.",
            );
          return next;
        });
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [phase]);

  const depth = depthScore(response);
  const deepEnough = depth >= 50;
  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");
  const timerTone =
    seconds < SOFT_LIMIT_SEC * 0.6
      ? "text-brand-primary"
      : seconds < SOFT_LIMIT_SEC * 0.9
      ? "text-amber-600"
      : "text-rose-600 animate-pulse";

  // ── Paste guard for textarea ──────────────────────────────────────
  const onPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    setPasteAttempts((n) => n + 1);
    setWarning("Paste is disabled. Type your answer in your own words.");
  }, []);

  // ── Submit ───────────────────────────────────────────────────────
  async function submit() {
    if (!deepEnough) return;
    setPhase("submitting");
    const timeTakenSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobId: params.id,
        response,
        tabSwitches,
        pasteAttempts,
        timeTakenSec,
      }),
    });
    const data = await res.json();

    // Server rejected the submission (not a failed grade). Route/notify
    // sensibly instead of falling through to the "you failed" screen.
    if (!res.ok) {
      if (
        res.status === 409 &&
        data.error === "already_applied" &&
        data.applicationId
      ) {
        router.push(`/student/applications/${data.applicationId}`);
        return;
      }
      if (res.status === 402 && data.error === "quota_exceeded") {
        router.push("/upgrade?to=premium");
        return;
      }
      // job_inactive, profile_incomplete, or anything else → back to the
      // form with the server's message.
      setWarning(
        data.message ?? data.error ?? "Couldn't submit. Please try again.",
      );
      setPhase("focus");
      return;
    }

    // Rocket bobs for 1.6s
    await new Promise((r) => setTimeout(r, 1600));
    if (data.passed) {
      setPhase("success");
      setTimeout(() => router.push("/dashboard"), 1800);
    } else {
      // Pull recommended bootcamps + missing skills
      const studentSkills: string[] = data.studentSkills ?? [];
      const missingSkills: string[] = job
        ? job.skills.filter(
            (s) =>
              !studentSkills
                .map((p) => p.toLowerCase())
                .includes(s.toLowerCase()),
          )
        : [];
      // Fetch bootcamp recs
      const recs: Bootcamp[] = [];
      for (const skill of missingSkills.slice(0, 3)) {
        try {
          const r = await fetch(
            `/api/bootcamps?skill=${encodeURIComponent(skill)}`,
          );
          if (r.ok) {
            const list: Bootcamp[] = await r.json();
            const match = list.find(
              (b) => b.skill.toLowerCase() === skill.toLowerCase(),
            );
            if (match) recs.push(match);
          }
        } catch {
          /* swallow */
        }
      }
      setFailure({
        grade: data.assessment?.grade,
        recommendedBootcamps: recs,
        studentSkills,
        missingSkills,
      });
      setPhase("failure");
    }
  }

  // ── Phase: loading ────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <main className="relative min-h-screen grid place-items-center">
        <BlobField />
        <p className="text-brand-muted">Loading the gauntlet…</p>
      </main>
    );
  }

  // ── Phase: briefing (Pre-Assessment) ──────────────────────────────
  if (phase === "briefing" && job) {
    const canBegin = consents.truth && consents.ownWork && consents.integrity;
    return (
      <main className="relative min-h-screen">
        <BlobField />
        <GlassNavbar />
        <div className="mx-auto max-w-2xl px-4 pt-10 pb-16">
          <Link
            href={`/missions/${job.id}`}
            className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-5"
          >
            <ArrowLeft size={14} /> Back to mission brief
          </Link>

          <div className="text-center mb-6">
            <GlassBadge tone="brand">
              <Target size={11} /> The Gauntlet
            </GlassBadge>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-3">
              Ready to make your case?
            </h1>
            <p className="text-sm text-brand-muted mt-2">
              The gauntlet is one situational prompt. AI grades depth, evidence,
              and trade-offs. Recruiter sees your answer + the AI notes
              side-by-side.
            </p>
          </div>

          {/* Brief stats */}
          <GlassCard variant="strong" className="!p-6 mb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={<Clock size={14} />} label="Time" value="~20 min" />
              <Stat
                icon={<Target size={14} />}
                label="Questions"
                value={`${TOTAL_QUESTIONS}`}
              />
              <Stat
                icon={<CheckCircle2 size={14} />}
                label="Pass mark"
                value="55+"
              />
              <Stat
                icon={<ShieldCheck size={14} />}
                label="Retries"
                value="1 free"
              />
            </div>
            <p className="text-[11px] text-brand-muted mt-5 pt-4 border-t border-brand-ink/5 leading-relaxed">
              <strong className="text-brand-ink">Heads up:</strong> tab switches
              and paste attempts are flagged on your integrity score (recruiter
              sees this). One pause allowed per assessment. Your application
              slot is only returned if a recruiter{" "}
              <span className="text-emerald-700 font-semibold">
                misses their SLA
              </span>
              .
            </p>
          </GlassCard>

          {/* Honesty Pact */}
          <GlassCard className="!p-6 mb-5">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
              Honesty Pact · all three required
            </p>
            <div className="space-y-3">
              <Consent
                checked={consents.truth}
                onChange={(v) => setConsents({ ...consents, truth: v })}
                label="I will answer truthfully — no fabricated experience, no embellished metrics."
              />
              <Consent
                checked={consents.ownWork}
                onChange={(v) => setConsents({ ...consents, ownWork: v })}
                label="This response is my own work — not AI-generated, not copied from elsewhere."
              />
              <Consent
                checked={consents.integrity}
                onChange={(v) => setConsents({ ...consents, integrity: v })}
                label="I understand that tab switches and paste attempts lower my integrity score and are visible to the recruiter."
              />
            </div>
          </GlassCard>

          <button
            onClick={() => {
              startedAtRef.current = Date.now();
              setPhase("focus");
            }}
            disabled={!canBegin}
            className="btn-brand w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ minHeight: 56 }}
          >
            <Target size={16} />
            Begin Assessment →
          </button>
        </div>
      </main>
    );
  }

  // ── Phase: focus (Main Assessment) ────────────────────────────────
  if (phase === "focus" && job) {
    return (
      <main className="relative min-h-screen bg-gradient-to-br from-brand-light to-white">
        {/* Locked top bar */}
        <header className="sticky top-0 z-40 border-b border-brand-ink/10 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-4">
            <div
              className="flex items-center gap-2 opacity-70 cursor-not-allowed select-none"
              title="Locked during assessment"
            >
              <Logo size="sm" />
            </div>

            {/* Progress dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-brand-primary shadow-brand-glow"
                />
              ))}
              <span className="text-[10px] text-brand-muted ml-1 font-mono">
                {1} / {TOTAL_QUESTIONS}
              </span>
            </div>

            {/* Soft timer */}
            <div className="flex items-center gap-3">
              <span
                className={clsx(
                  "inline-flex items-center gap-1 text-sm font-mono font-bold",
                  timerTone,
                )}
              >
                <Clock size={14} />
                {mm}:{ss}
              </span>
              {!pauseUsed && (
                <button
                  onClick={() => {
                    setPaused(true);
                    setPauseUsed(true);
                  }}
                  disabled={paused}
                  className="text-xs font-semibold text-brand-primary hover:underline disabled:text-brand-muted disabled:no-underline"
                >
                  <Pause size={12} className="inline mr-1" />
                  Pause once
                </button>
              )}
            </div>
          </div>

          {/* Integrity flags row */}
          {(tabSwitches > 0 || pasteAttempts > 0) && (
            <div className="bg-amber-500/10 border-t border-amber-500/30 px-4 py-1.5 text-center">
              <p className="text-[11px] text-amber-700 font-semibold inline-flex items-center gap-1.5">
                <AlertTriangle size={11} />
                Integrity flags: tab-switches {tabSwitches} · paste{" "}
                {pasteAttempts}
              </p>
            </div>
          )}
        </header>

        {/* Pause overlay */}
        {paused && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-brand-ink/40 backdrop-blur-sm p-4">
            <GlassCard variant="strong" className="!p-8 text-center max-w-md">
              <Pause size={28} className="mx-auto text-brand-primary mb-3" />
              <p className="font-display font-bold text-xl text-brand-ink">
                Paused
              </p>
              <p className="text-sm text-brand-muted mt-2 mb-5">
                Timer stopped. Step away as long as you need.
              </p>
              <GlassButton
                variant="brand"
                fullWidth
                onClick={() => setPaused(false)}
              >
                Resume
              </GlassButton>
            </GlassCard>
          </div>
        )}

        {/* Question stage */}
        <div className="mx-auto max-w-4xl px-4 py-8">
          {warning && (
            <div className="mb-4 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 text-amber-700 text-sm font-semibold inline-flex items-center gap-2">
              <AlertTriangle size={14} />
              {warning}
              <button
                onClick={() => setWarning(null)}
                className="ml-auto text-amber-700/70 hover:text-amber-700"
              >
                <XCircle size={14} />
              </button>
            </div>
          )}

          <GlassCard variant="strong" className="!p-7 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <GlassBadge tone="brand">Question 1 of {TOTAL_QUESTIONS}</GlassBadge>
              <GlassBadge tone="neutral">Scenario</GlassBadge>
              {job.skills[0] && (
                <GlassBadge tone="neutral">{job.skills[0]}</GlassBadge>
              )}
            </div>
            <p className="font-display text-lg text-brand-ink leading-relaxed">
              {job.gauntletPrompt}
            </p>
          </GlassCard>

          <GlassCard className="!p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                Your response
              </p>
              <p className="text-xs text-brand-muted">
                {response.length} chars ·{" "}
                {response.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              onPaste={onPaste}
              autoFocus
              rows={12}
              className="w-full bg-white/60 border border-brand-ink/10 rounded-xl px-4 py-3 text-sm text-brand-ink resize-y focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary leading-relaxed"
              placeholder="Write your real answer. Name the trade-offs explicitly. Include the metric you'd watch. Tell the truth about what you'd cut."
            />

            {/* Depth indicator */}
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-muted mb-1.5">
                Depth indicator
              </p>
              <div className="relative h-2 rounded-full bg-brand-ink/10 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, depth)}%`,
                    background: deepEnough
                      ? "linear-gradient(90deg, #10b981, #059669)"
                      : depth >= 30
                      ? "linear-gradient(90deg, #f59e0b, #d97706)"
                      : "linear-gradient(90deg, #ef4444, #dc2626)",
                  }}
                />
              </div>
              <p
                className={clsx(
                  "text-xs mt-1.5 font-medium",
                  deepEnough ? "text-emerald-700" : "text-brand-muted",
                )}
              >
                {deepEnough
                  ? "Depth OK · ready to submit when you're done."
                  : "Keep going. Name the trade-offs. Cite the metric."}
              </p>
            </div>
          </GlassCard>

          {/* Bottom navigation */}
          <div className="mt-5 flex items-center justify-between flex-wrap gap-3">
            <Link
              href={`/missions/${job.id}`}
              className="text-xs text-brand-muted hover:text-brand-ink inline-flex items-center gap-1"
            >
              <ChevronLeft size={12} /> Discard &amp; exit
            </Link>
            <p className="text-[11px] text-brand-muted">
              <Eye size={11} className="inline mr-1" />
              Auto-saved locally · paste disabled · integrity tracked
            </p>
            <GlassButton
              variant="brand"
              size="lg"
              disabled={!deepEnough}
              onClick={submit}
            >
              <Rocket size={14} /> Submit Assessment →
            </GlassButton>
          </div>
        </div>
      </main>
    );
  }

  // ── Phase: submitting (rocket animation) ─────────────────────────
  if (phase === "submitting") {
    return (
      <main className="relative min-h-screen grid place-items-center">
        <BlobField />
        <div className="text-center">
          <div className="animate-bounce mx-auto grid place-items-center w-24 h-24 rounded-3xl bg-brand-gradient text-white shadow-brand-glow">
            <Rocket size={40} />
          </div>
          <p className="font-display font-extrabold text-2xl text-brand-ink mt-5">
            Launching your application…
          </p>
          <p className="text-sm text-brand-muted mt-2">
            AI is grading your response.
          </p>
        </div>
      </main>
    );
  }

  // ── Phase: success ────────────────────────────────────────────────
  if (phase === "success") {
    return (
      <main className="relative min-h-screen grid place-items-center">
        <BlobField />
        <div className="text-center">
          <div className="mx-auto grid place-items-center w-24 h-24 rounded-3xl bg-emerald-500 text-white shadow-glass-lg">
            <CheckCircle2 size={40} />
          </div>
          <p className="font-display font-extrabold text-3xl text-brand-ink mt-5">
            🚀 Application launched
          </p>
          <p className="text-sm text-brand-muted mt-2 max-w-md mx-auto">
            Recruiter has the SLA clock ticking. You&apos;ll see status updates on
            your Today dashboard.
          </p>
        </div>
      </main>
    );
  }

  // ── Phase: failure (coaching moment) ──────────────────────────────
  if (phase === "failure" && job) {
    return (
      <main className="relative min-h-screen">
        <BlobField />
        <GlassNavbar />
        <div className="mx-auto max-w-3xl px-4 pt-10 pb-16">
          <div className="text-center mb-8">
            <div className="mx-auto grid place-items-center w-20 h-20 rounded-3xl bg-amber-500 text-white shadow-glass-lg mb-4">
              <Ghost size={32} />
            </div>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink">
              Not quite — but you&apos;re closer than you think.
            </h1>
            <p className="text-sm text-brand-muted mt-3">
              This attempt counted, but the gap is small. Here&apos;s the path
              forward to clear the bar next time.
            </p>
          </div>

          {/* AI 3-bullet analysis */}
          <GlassCard className="!p-6 mb-5">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
              <Sparkles size={12} /> AI feedback
            </p>
            <ul className="space-y-2 text-sm text-brand-ink/90">
              <Bullet text={failure?.grade?.notes ?? "Add more specific trade-offs and one concrete metric you'd watch."} />
              <Bullet
                text={
                  failure && failure.missingSkills.length > 0
                    ? `Skills the recruiter expects: ${failure.missingSkills.slice(0, 3).join(", ")}.`
                    : "Tighten the structure: problem → approach → trade-offs → metric."
                }
              />
              <Bullet text="Cite one real situation (yours or analogous) and the measurable outcome." />
            </ul>
          </GlassCard>

          {/* The Path Forward */}
          <GlassCard glow className="!p-6">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2 flex items-center gap-1.5">
              <GraduationCap size={12} /> The path forward
            </p>
            <p className="text-sm text-brand-ink mb-4 leading-relaxed">
              Complete one of these bootcamps to verify the missing skill and
              unlock a retry on this assessment.
            </p>
            {failure && failure.recommendedBootcamps.length > 0 ? (
              <div className="space-y-3">
                {failure.recommendedBootcamps.map((b) => (
                  <Link
                    key={b.id}
                    href={`/bootcamp/${b.id}`}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-white/60 border border-white/60 p-4 hover:-translate-y-0.5 hover:shadow-glass-hover transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
                        <GraduationCap size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-semibold text-sm text-brand-ink line-clamp-1">
                          {b.title}
                        </p>
                        <p className="text-xs text-brand-muted">
                          Closes the {b.skill} gap · ★ {b.rating}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-violet-700 inline-flex items-center gap-1 shrink-0">
                      ✦ Premium
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-brand-muted">
                No bootcamps available yet for the gap skills — try widening
                your trajectory in Settings.
              </p>
            )}
          </GlassCard>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard" className="btn-glass">
              ← Back to today
            </Link>
            <Link href="/bootcamps" className="btn-brand">
              Browse all bootcamps
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center">
      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
        {icon}
        {label}
      </p>
      <p className="font-display font-bold text-lg text-brand-ink mt-1">
        {value}
      </p>
    </div>
  );
}

function Consent({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded accent-brand-primary"
      />
      <span className="text-sm text-brand-ink/85 leading-relaxed">{label}</span>
    </label>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary mt-2 shrink-0" />
      <span>{text}</span>
    </li>
  );
}
