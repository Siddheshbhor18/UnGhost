"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  GraduationCap,
  Pause,
  Save,
  Send,
  Trophy,
  Upload,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import { TutorPanel } from "@/components/student/TutorPanel";
import type {
  AssignmentRubricCriterion,
  AssignmentGrade,
} from "@/shared/types/ai";
import type { Bootcamp, BootcampProgress } from "@/shared/types";

interface Props {
  bootcamp: Bootcamp;
  initialProgress: BootcampProgress;
  rubric: AssignmentRubricCriterion[];
}

export function AssignmentView({ bootcamp, initialProgress, rubric }: Props) {
  const [progress, setProgress] = useState<BootcampProgress>(initialProgress);
  const [writeup, setWriteup] = useState<string>(
    progress.assignment?.writeup ?? "",
  );
  const [reflection, setReflection] = useState<string>(
    progress.assignment?.reflection ?? "",
  );
  const [fileNames, setFileNames] = useState<string[]>(
    progress.assignment?.fileNames ?? [],
  );
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [confirmOwnWork, setConfirmOwnWork] = useState(false);
  const [busy, setBusy] = useState(false);
  // When a submission scores below the pass mark, the student can return to
  // the editor and resubmit. This flips the view back to the form.
  const [retrying, setRetrying] = useState(false);

  const isSubmitted = !!progress.assignment?.submittedAt;
  const grade = progress.assignment?.grade;
  const passed = !!progress.verifiedBadgeIssued;
  const wordCount = useMemo(
    () => writeup.split(/\s+/).filter(Boolean).length,
    [writeup],
  );
  const reflWords = useMemo(
    () => reflection.split(/\s+/).filter(Boolean).length,
    [reflection],
  );

  // ── Expiration countdown ────────────────────────────────────
  const expiresAt = progress.assignment?.expiresAt;
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  useEffect(() => {
    if (!expiresAt || isSubmitted) return;
    const tick = () => {
      const diff =
        new Date(expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(diff / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt, isSubmitted]);

  const countdownLabel = useMemo(() => {
    if (!secondsLeft) return "—";
    const d = Math.floor(secondsLeft / 86400);
    const h = Math.floor((secondsLeft % 86400) / 3600);
    const m = Math.floor((secondsLeft % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }, [secondsLeft]);

  const countdownTone =
    secondsLeft <= 0
      ? "text-rose-600"
      : secondsLeft < 86400
      ? "text-rose-600"
      : secondsLeft < 3 * 86400
      ? "text-amber-600"
      : "text-emerald-600";

  // ── Submit ──────────────────────────────────────────────────
  async function submit() {
    if (!confirmOwnWork || wordCount < 100 || reflWords < 20) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/student/bootcamps/${bootcamp.id}/assignment`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ writeup, reflection, fileNames }),
        },
      );
      const data: {
        grade: AssignmentGrade;
        progress: BootcampProgress;
        error?: string;
      } = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
      setProgress(data.progress);
      setShowSubmitModal(false);
      setRetrying(false);
    } finally {
      setBusy(false);
    }
  }

  async function healthPause() {
    if (progress.assignment?.healthPauseUsed) return;
    // Real impl: POST /api/student/assignments/{id}/health-pause
    setProgress((p) => ({
      ...p,
      assignment: p.assignment
        ? {
            ...p.assignment,
            healthPauseUsed: true,
            expiresAt: new Date(
              new Date(p.assignment.expiresAt).getTime() + 14 * 86400_000,
            ).toISOString(),
          }
        : undefined,
    }));
  }

  // ── Submitted → Results screen ──────────────────────────────
  if (isSubmitted && grade && !retrying) {
    return (
      <ResultsView
        bootcamp={bootcamp}
        grade={grade}
        progress={progress}
        rubric={rubric}
        onRetry={passed ? undefined : () => setRetrying(true)}
      />
    );
  }

  return (
    <div className="grid lg:grid-cols-12 gap-5">
      {/* ── Center: brief + submission editor ─────────── */}
      <div className="lg:col-span-9 space-y-5">
        <Link
          href={`/student/my-bootcamps/${bootcamp.id}/learn`}
          className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
        >
          <ChevronLeft size={12} /> Back to lessons
        </Link>

        {/* Header / countdown */}
        <GlassCard>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <GlassBadge tone="brand">Post-session assignment</GlassBadge>
              <h1 className="font-display font-extrabold text-2xl md:text-3xl text-brand-ink mt-2">
                Apply what you learned
              </h1>
              <p className="text-sm text-brand-muted mt-1 max-w-xl">
                Submit a focused write-up plus a short reflection. AI grades 5
                rubric criteria. Score 70+ to earn the Verified Skill badge —
                you can resubmit if you fall short.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                Expires in
              </p>
              <p
                className={`font-display font-bold text-2xl flex items-center gap-1 ${countdownTone}`}
              >
                <Clock size={18} />
                {countdownLabel}
              </p>
              {progress.assignment?.healthPauseUsed && (
                <p className="text-[10px] text-amber-600 font-semibold mt-1">
                  Health Pause active
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Assignment brief */}
        <GlassCard>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
            Assignment brief
          </p>
          <div className="text-sm text-brand-ink/90 leading-relaxed space-y-3">
            <p>
              Choose a real-world problem in your domain that{" "}
              <span className="font-semibold text-brand-primary">
                {bootcamp.skill}
              </span>{" "}
              could solve. Describe the problem, propose your approach using
              concepts from this bootcamp, and walk through the trade-offs you'd
              consciously accept.
            </p>
            <ul className="list-disc list-inside text-brand-ink/80 space-y-1">
              <li>200–2000 word write-up (recommended 600)</li>
              <li>One short reflection (max 300 words)</li>
              <li>Optional: code, screenshots, walkthrough video (up to 5 files)</li>
            </ul>
            <p className="text-xs text-brand-muted">
              Evaluation rubric: 5 criteria × 20 points each. Top-10 submissions
              per cohort feature on your public profile.
            </p>
          </div>
        </GlassCard>

        {/* Submission editor */}
        <GlassCard>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <FileText size={12} /> Your write-up
          </p>
          <textarea
            value={writeup}
            onChange={(e) => setWriteup(e.target.value)}
            placeholder="Describe the problem, your approach, and the trade-offs…"
            rows={14}
            className="w-full bg-white/60 border border-brand-ink/10 rounded-xl px-4 py-3 text-sm text-brand-ink resize-y focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          />
          <div className="flex items-center justify-between mt-2 text-xs">
            <span
              className={
                wordCount >= 100
                  ? "text-emerald-600 font-semibold"
                  : "text-amber-600"
              }
            >
              {wordCount} words {wordCount < 100 && "(min 100)"}
            </span>
            <span className="text-brand-muted">Auto-saved locally</span>
          </div>
        </GlassCard>

        {/* Files */}
        <GlassCard>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <Upload size={12} /> Attachments (optional · max 5 files)
          </p>
          <label className="block rounded-2xl border-2 border-dashed border-brand-ink/15 p-6 text-center cursor-pointer hover:border-brand-primary/50 hover:bg-white/40 transition">
            <input
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                const fs = Array.from(e.target.files ?? []);
                setFileNames((prev) =>
                  [...prev, ...fs.map((f) => f.name)].slice(0, 5),
                );
              }}
            />
            <Upload size={20} className="mx-auto text-brand-primary mb-2" />
            <p className="text-sm font-semibold text-brand-ink">
              Drop files or click to upload
            </p>
            <p className="text-xs text-brand-muted mt-1">
              PDF, PNG, JPG, MP4, .py, .js, .ipynb · 100MB each
            </p>
          </label>
          {fileNames.length > 0 && (
            <ul className="mt-3 space-y-1">
              {fileNames.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between bg-white/40 rounded-lg px-3 py-1.5 text-xs"
                >
                  <span className="text-brand-ink truncate">{f}</span>
                  <button
                    onClick={() =>
                      setFileNames(fileNames.filter((_, j) => j !== i))
                    }
                    className="text-rose-600 hover:underline"
                  >
                    remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {/* Reflection */}
        <GlassCard>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
            Reflection
          </p>
          <p className="text-xs text-brand-muted mb-2">
            In a few sentences: what surprised you? What would you do
            differently next time?
          </p>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Your honest reflection (max 300 words)…"
            rows={5}
            maxLength={2000}
            className="w-full bg-white/60 border border-brand-ink/10 rounded-xl px-4 py-3 text-sm text-brand-ink resize-y focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
          />
          <p
            className={`text-xs mt-2 ${
              reflWords >= 20 ? "text-emerald-600 font-semibold" : "text-amber-600"
            }`}
          >
            {reflWords} words {reflWords < 20 && "(min 20)"}
          </p>
        </GlassCard>

        {/* Sticky action bar */}
        <div className="sticky bottom-3 bg-white/85 backdrop-blur-2xl border border-white/60 rounded-2xl shadow-glass-lg px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            <GlassButton
              variant="glass"
              size="sm"
              onClick={healthPause}
              disabled={progress.assignment?.healthPauseUsed}
            >
              <Pause size={12} />
              {progress.assignment?.healthPauseUsed
                ? "Health Pause used"
                : "Pause my timer (14d)"}
            </GlassButton>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-brand-muted hidden md:inline">
              <Save size={11} className="inline mr-1" />
              Saved locally
            </span>
            <GlassButton
              variant="brand"
              size="md"
              onClick={() => setShowSubmitModal(true)}
              disabled={wordCount < 100 || reflWords < 20}
            >
              <Send size={14} /> Submit assignment
            </GlassButton>
          </div>
        </div>
      </div>

      {/* ── Right: AI Tutor (assignment-mode) ─────────── */}
      <div className="lg:col-span-3">
        <TutorPanel bootcampId={bootcamp.id} videoTitle="Assignment workspace" />
      </div>

      {/* ── Submit confirmation modal ─────────────────── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
            onClick={() => setShowSubmitModal(false)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 shadow-glass-lg p-6">
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
              Final review
            </p>
            <h3 className="font-display font-bold text-xl text-brand-ink mt-2">
              Ready to submit?
            </h3>
            <ul className="mt-4 space-y-1.5 text-sm">
              <Row label="Word count" value={wordCount} />
              <Row label="Reflection length" value={`${reflWords} words`} />
              <Row label="Files attached" value={fileNames.length} />
              <Row label="Rubric criteria" value={rubric.length} />
            </ul>
            <label className="flex items-start gap-2 mt-5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmOwnWork}
                onChange={(e) => setConfirmOwnWork(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-brand-primary"
              />
              <span className="text-xs text-brand-ink/85 leading-relaxed">
                I confirm this is my own work. AI-generated or plagiarised
                submissions result in a permanent profile flag visible to
                recruiters.
              </span>
            </label>
            <div className="mt-5 flex gap-2">
              <GlassButton
                variant="glass"
                fullWidth
                onClick={() => setShowSubmitModal(false)}
              >
                ← Edit
              </GlassButton>
              <GlassButton
                variant="brand"
                fullWidth
                onClick={submit}
                disabled={!confirmOwnWork || busy}
              >
                {busy ? "Grading…" : "Submit final"}
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-brand-muted">{label}</span>
      <span className="font-display font-semibold text-brand-ink">{value}</span>
    </li>
  );
}

// ── Results screen (after submission) ──────────────────────────
function ResultsView({
  bootcamp,
  grade,
  progress,
  rubric,
  onRetry,
}: {
  bootcamp: Bootcamp;
  grade: NonNullable<BootcampProgress["assignment"]>["grade"];
  progress: BootcampProgress;
  rubric: AssignmentRubricCriterion[];
  onRetry?: () => void;
}) {
  if (!grade) return null;
  const isTop10 = grade.totalScore >= 85;
  return (
    <div className="space-y-6">
      <Link
        href={`/student/my-bootcamps/${bootcamp.id}/learn`}
        className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline"
      >
        <ChevronLeft size={12} /> Back to lessons
      </Link>

      <GlassCard variant="strong" className="!p-8 text-center">
        <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-brand-gradient text-white shadow-brand-glow mb-3">
          <GraduationCap size={28} />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
          Assignment graded
        </p>
        <h2 className="font-display font-extrabold text-6xl text-brand-ink mt-3 leading-none">
          {grade.totalScore}
          <span className="text-2xl text-brand-muted">/100</span>
        </h2>
        <p className="text-sm text-brand-muted mt-3">
          {isTop10
            ? "Top 10 percentile — your submission features publicly."
            : grade.totalScore >= 70
            ? "Solid pass. Verified Skill badge issued."
            : "Submitted. Read feedback below."}
        </p>
        {isTop10 && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
            <Trophy size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              Top 10 — public leaderboard
            </span>
          </div>
        )}
        {onRetry && (
          <div className="mt-5">
            <GlassButton variant="brand" onClick={onRetry}>
              Revise &amp; resubmit
            </GlassButton>
          </div>
        )}
      </GlassCard>

      <div className="grid md:grid-cols-2 gap-5">
        <GlassCard>
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-3 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Strengths
          </p>
          <ul className="space-y-2 text-sm text-brand-ink/90">
            {grade.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2
                  size={14}
                  className="text-emerald-600 mt-0.5 shrink-0"
                />
                {s}
              </li>
            ))}
          </ul>
        </GlassCard>
        <GlassCard>
          <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-3 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Improvements
          </p>
          <ul className="space-y-2 text-sm text-brand-ink/90">
            {grade.improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle
                  size={14}
                  className="text-amber-600 mt-0.5 shrink-0"
                />
                {s}
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard>
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
          Rubric breakdown
        </p>
        <ul className="space-y-3">
          {grade.perCriterion.map((c) => {
            const def = rubric.find((r) => r.key === c.key);
            return (
              <li
                key={c.key}
                className="rounded-2xl bg-white/40 border border-brand-ink/5 p-4"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-display font-semibold text-sm text-brand-ink">
                    {def?.label ?? c.key}
                  </p>
                  <p className="font-display font-bold text-brand-primary">
                    {c.score}/20
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-brand-ink/5 mb-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary"
                    style={{ width: `${(c.score / 20) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-brand-muted leading-relaxed">
                  {c.feedback}
                </p>
              </li>
            );
          })}
        </ul>
      </GlassCard>

      <GlassCard className="bg-emerald-500/5 border-emerald-500/20 text-center">
        <Award size={24} className="mx-auto text-emerald-600 mb-2" />
        <p className="font-display font-bold text-emerald-700">
          Verified Skill badge: {bootcamp.skill}
        </p>
        <p className="text-sm text-brand-muted mt-1">
          Now visible on your public profile and to recruiters in candidate
          search. Increments your match score on future jobs requiring{" "}
          {bootcamp.skill}.
        </p>
      </GlassCard>
    </div>
  );
}
