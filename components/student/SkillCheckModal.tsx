"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GraduationCap,
  X,
  XCircle,
} from "lucide-react";
import { GlassButton } from "@/components/glass";
import type { SkillCheckGrade, SkillCheckQuestion } from "@/shared/types/ai";

interface Props {
  bootcampId: string;
  videoId: string;
  videoTitle: string;
  onClose: () => void;
  onPassed: () => void;
}

const TIMER_SEC = 10 * 60;
const PASS_THRESHOLD = 70;

export function SkillCheckModal({
  bootcampId,
  videoId,
  videoTitle,
  onClose,
  onPassed,
}: Props) {
  // Questions (without the answer key) are fetched from the server — the
  // browser never receives correctIdx/rubric, and grading is done against
  // the server's own copy.
  const [questions, setQuestions] = useState<SkillCheckQuestion[] | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SEC);
  const [answers, setAnswers] = useState<
    Record<string, string | number | undefined>
  >({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SkillCheckGrade | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/student/bootcamps/${bootcampId}/skill-check?videoId=${encodeURIComponent(videoId)}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && Array.isArray(d.questions)) setQuestions(d.questions);
      })
      .catch(() => {
        if (!cancelled) setQuestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [bootcampId, videoId]);

  const remaining = useMemo(() => {
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [secondsLeft]);

  useEffect(() => {
    if (result) return;
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, result]);

  async function submit() {
    if (busy || !questions) return;
    setBusy(true);
    try {
      const payload = {
        videoId,
        answers: questions
          .map((q) => ({
            questionId: q.id,
            answer: answers[q.id] ?? (q.type === "mcq" ? -1 : ""),
          }))
          .filter((a) => a.answer !== undefined),
      };
      const res = await fetch(
        `/api/student/bootcamps/${bootcampId}/skill-check`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data: {
        grade: SkillCheckGrade;
        attemptsLeft: number;
        error?: string;
      } = await res.json();
      if (data.error) {
        alert(data.error);
        onClose();
        return;
      }
      setResult(data.grade);
      setAttemptsLeft(data.attemptsLeft);
      if (data.grade.passed) {
        setTimeout(onPassed, 1800);
      }
    } finally {
      setBusy(false);
    }
  }

  // ── Results screen ────────────────────────────────────────────────────
  if (result) {
    return (
      <Backdrop onClose={onClose}>
        <div className="text-center mb-5">
          {result.passed ? (
            <>
              <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-glass-lg mb-3">
                <GraduationCap size={28} />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
                Module checkpoint unlocked
              </p>
              <h2 className="font-display text-3xl font-extrabold text-brand-ink mt-2">
                {result.score}%
              </h2>
              <p className="text-sm text-brand-muted mt-1">
                {result.summary}
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-amber-500 text-white shadow-glass-lg mb-3">
                <AlertTriangle size={28} />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold">
                Not yet — 70% needed
              </p>
              <h2 className="font-display text-3xl font-extrabold text-brand-ink mt-2">
                {result.score}%
              </h2>
              <p className="text-sm text-brand-muted mt-1">{result.summary}</p>
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <p className="text-xs text-amber-700 mt-2 font-semibold">
                  {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left · 30-min
                  cooldown before retry
                </p>
              )}
            </>
          )}
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {result.perQuestion.map((p, i) => (
            <div
              key={p.questionId}
              className={`rounded-xl border p-3 ${
                p.correct
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-rose-500/5 border-rose-500/20"
              }`}
            >
              <div className="flex items-start gap-2">
                {p.correct ? (
                  <CheckCircle2
                    size={14}
                    className="text-emerald-600 mt-0.5 shrink-0"
                  />
                ) : (
                  <XCircle size={14} className="text-rose-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-semibold text-brand-ink">
                    Q{i + 1}
                  </p>
                  <p className="text-xs text-brand-muted mt-0.5">{p.feedback}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          {result.passed ? (
            <GlassButton variant="brand" fullWidth onClick={onPassed}>
              Continue learning →
            </GlassButton>
          ) : (
            <GlassButton variant="glass" fullWidth onClick={onClose}>
              Back to lesson
            </GlassButton>
          )}
        </div>
      </Backdrop>
    );
  }

  // ── Loading questions ─────────────────────────────────────────────────
  if (!questions) {
    return (
      <Backdrop onClose={onClose}>
        <p className="text-center text-sm text-brand-muted py-10">
          Loading verification…
        </p>
      </Backdrop>
    );
  }

  // ── Quiz screen ───────────────────────────────────────────────────────
  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
            Skill Verification
          </p>
          <p className="font-display text-lg font-bold text-brand-ink">
            {videoTitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1 text-sm font-mono font-bold ${
              secondsLeft < 60
                ? "text-rose-600"
                : secondsLeft < 180
                ? "text-amber-600"
                : "text-brand-ink"
            }`}
          >
            <Clock size={14} /> {remaining}
          </span>
          <button
            onClick={onClose}
            className="text-brand-muted hover:text-rose-600"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <p className="text-xs text-brand-muted mb-4">
        {questions.length} questions · {PASS_THRESHOLD}% to pass · 3 attempts
      </p>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className="rounded-2xl bg-white/40 border border-brand-ink/5 p-4"
          >
            <p className="font-display font-semibold text-sm text-brand-ink mb-3">
              <span className="text-brand-primary mr-1.5">Q{i + 1}.</span>
              {q.prompt}
            </p>
            {q.type === "mcq" ? (
              <div className="space-y-1.5">
                {q.options?.map((opt, idx) => (
                  <label
                    key={idx}
                    className={`flex items-center gap-2 rounded-xl p-2.5 cursor-pointer border transition ${
                      answers[q.id] === idx
                        ? "bg-brand-primary/10 border-brand-primary"
                        : "bg-white/40 border-brand-ink/10 hover:border-brand-primary/50"
                    }`}
                  >
                    <input
                      type="radio"
                      className="accent-brand-primary"
                      name={q.id}
                      checked={answers[q.id] === idx}
                      onChange={() =>
                        setAnswers({ ...answers, [q.id]: idx })
                      }
                    />
                    <span className="text-sm text-brand-ink">{opt}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                value={(answers[q.id] as string) ?? ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [q.id]: e.target.value })
                }
                rows={3}
                placeholder="Type your answer…"
                className="w-full bg-white/60 border border-brand-ink/10 rounded-xl px-3 py-2 text-sm text-brand-ink resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <GlassButton variant="glass" onClick={onClose}>
          Cancel
        </GlassButton>
        <GlassButton variant="brand" onClick={submit} disabled={busy}>
          {busy ? "Grading…" : "Submit answers"}
        </GlassButton>
      </div>
    </Backdrop>
  );
}

function Backdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/60 shadow-glass-lg p-6">
        {children}
      </div>
    </div>
  );
}
