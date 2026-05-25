"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassTextarea,
} from "@/components/glass";

interface Criterion {
  key: string;
  score: number;
  feedback: string;
}

interface InitialGrade {
  totalScore: number;
  perCriterion: Criterion[];
  strengths: string[];
  improvements: string[];
  plagiarismFlag: boolean;
  instructorNote: string;
}

interface AiSnapshot {
  totalScore: number;
  perCriterion: Criterion[];
  strengths: string[];
  improvements: string[];
  gradedAt: string;
}

interface Props {
  studentId: string;
  bootcampId: string;
  initial: InitialGrade;
  aiSnapshot: AiSnapshot | null;
}

/**
 * GradingOverrideForm — full edit surface for an instructor reviewing an
 * AI-graded submission.
 *
 * UX rules:
 *   • Each criterion is its own row (score 0-100 + free feedback).
 *   • Strengths + improvements are simple add/remove string lists.
 *   • Total score auto-suggests as the rounded mean of per-criterion scores
 *     IF the instructor edits criteria but hasn't manually set a total yet
 *     this session. Once they touch the total field directly, we stop
 *     auto-syncing (otherwise we'd fight their cursor).
 *   • The original AI grade snapshot is shown collapsed at the bottom for
 *     diff context — never overwritten.
 *   • Save calls PATCH /api/instructor/grading/[studentId]/[bootcampId].
 *     On success, refresh the page so the "Awaiting review" badge flips.
 */
export function GradingOverrideForm({
  studentId,
  bootcampId,
  initial,
  aiSnapshot,
}: Props) {
  const router = useRouter();
  const [totalScore, setTotalScore] = useState(initial.totalScore);
  const [totalEdited, setTotalEdited] = useState(false);
  const [perCriterion, setPerCriterion] = useState<Criterion[]>(
    initial.perCriterion,
  );
  const [strengths, setStrengths] = useState<string[]>(initial.strengths);
  const [improvements, setImprovements] = useState<string[]>(
    initial.improvements,
  );
  const [plagiarismFlag, setPlagiarismFlag] = useState(initial.plagiarismFlag);
  const [instructorNote, setInstructorNote] = useState(initial.instructorNote);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateCriterion(i: number, patch: Partial<Criterion>) {
    setPerCriterion((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
    if (!totalEdited && patch.score !== undefined) {
      // Auto-sync total to mean of criterion scores until instructor edits it.
      const next = perCriterion.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r,
      );
      const avg = Math.round(
        next.reduce((s, c) => s + c.score, 0) / next.length,
      );
      setTotalScore(avg);
    }
  }

  function revertToAi() {
    if (!aiSnapshot) return;
    if (
      !confirm(
        "Revert all fields to the original AI grade? Your edits will be lost.",
      )
    )
      return;
    setTotalScore(aiSnapshot.totalScore);
    setPerCriterion(aiSnapshot.perCriterion);
    setStrengths(aiSnapshot.strengths);
    setImprovements(aiSnapshot.improvements);
    setTotalEdited(false);
  }

  async function save(): Promise<void> {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(
        `/api/instructor/grading/${studentId}/${bootcampId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            totalScore,
            perCriterion,
            strengths,
            improvements,
            plagiarismFlag,
            instructorNote: instructorNote || undefined,
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Save failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard className="!p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-1">
            Your review
          </p>
          <h2 className="font-display font-bold text-brand-ink text-lg">
            Override or confirm the AI grade
          </h2>
        </div>
        {aiSnapshot ? (
          <button
            onClick={revertToAi}
            className="text-[11px] text-brand-muted hover:text-brand-ink inline-flex items-center gap-1 transition"
          >
            <RotateCcw size={11} /> Revert to AI grade
          </button>
        ) : null}
      </div>

      {/* Total score */}
      <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
        <Field
          label="Total score (0-100)"
          hint={
            !totalEdited
              ? "Auto-synced from criteria mean. Edit to override."
              : "Manually set."
          }
        >
          <GlassInput
            type="number"
            min={0}
            max={100}
            value={totalScore}
            onChange={(e) => {
              setTotalScore(Number(e.target.value));
              setTotalEdited(true);
            }}
          />
        </Field>
        <label className="flex items-center gap-2 pb-3">
          <input
            type="checkbox"
            checked={plagiarismFlag}
            onChange={(e) => setPlagiarismFlag(e.target.checked)}
            className="w-4 h-4 accent-rose-600"
          />
          <span className="text-xs font-semibold text-rose-700 inline-flex items-center gap-1">
            <AlertTriangle size={12} /> Plagiarism flagged
          </span>
        </label>
      </div>

      {/* Per-criterion */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
          Per-criterion scores ({perCriterion.length})
        </p>
        <div className="space-y-2">
          {perCriterion.map((c, i) => (
            <div
              key={c.key + i}
              className="rounded-xl bg-white/60 border border-brand-ink/5 p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-brand-primary truncate">
                  {c.key}
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={c.score}
                  onChange={(e) =>
                    updateCriterion(i, { score: Number(e.target.value) })
                  }
                  className="ml-auto w-20 rounded-lg border border-brand-ink/15 bg-white px-2 py-1 text-xs text-brand-ink tnum text-right focus:outline-none focus:border-brand-primary"
                />
                <span className="text-[10px] text-brand-muted">/100</span>
              </div>
              <GlassTextarea
                value={c.feedback}
                onChange={(e) =>
                  updateCriterion(i, { feedback: e.target.value })
                }
                rows={2}
                placeholder="One-sentence feedback for this criterion"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Strengths + improvements */}
      <div className="grid md:grid-cols-2 gap-4">
        <StringList
          label="Strengths"
          items={strengths}
          onChange={setStrengths}
          accent="emerald"
        />
        <StringList
          label="Improvements"
          items={improvements}
          onChange={setImprovements}
          accent="amber"
        />
      </div>

      {/* Note (admin-side only) */}
      <Field
        label="Internal note (optional)"
        hint="Sent to student via email + visible on their assignment page"
      >
        <GlassTextarea
          value={instructorNote}
          onChange={(e) => setInstructorNote(e.target.value)}
          rows={3}
          placeholder="Why you changed scores, what to focus on next, etc."
        />
      </Field>

      {error ? (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-[11px] text-brand-muted">
          Student gets emailed + notified the moment you save.
        </p>
        <GlassButton
          variant="brand"
          onClick={save}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Saving…
            </>
          ) : (
            <>
              <Save size={14} /> Save review
            </>
          )}
        </GlassButton>
      </div>

      {/* AI snapshot — diff context */}
      {aiSnapshot ? (
        <details className="mt-4 border-t border-brand-ink/5 pt-4">
          <summary className="cursor-pointer text-[11px] text-brand-muted font-semibold uppercase tracking-wider">
            Original AI grade (read-only)
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[12px] text-brand-ink/85">
            <div>
              <p className="font-semibold mb-1">Score</p>
              <p>{aiSnapshot.totalScore}/100</p>
              <p className="text-[10px] text-brand-muted mt-2">
                graded {new Date(aiSnapshot.gradedAt).toLocaleString("en-IN")}
              </p>
            </div>
            <div>
              <p className="font-semibold mb-1">Per criterion</p>
              <ul className="space-y-0.5">
                {aiSnapshot.perCriterion.map((c) => (
                  <li key={c.key}>
                    {c.key}: <span className="font-mono">{c.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      ) : null}
    </GlassCard>
  );
}

function StringList({
  label,
  items,
  onChange,
  accent,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  accent: "emerald" | "amber";
}) {
  const dot =
    accent === "emerald" ? "bg-emerald-500" : "bg-amber-500";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
        {label}
      </p>
      <ul className="space-y-1.5">
        {items.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`}
            />
            <GlassInput
              value={s}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="text-sm"
            />
            <button
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-brand-muted hover:text-rose-600 transition shrink-0"
              aria-label={`Remove ${label.toLowerCase()}`}
              type="button"
            >
              <Trash2 size={12} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="text-[11px] text-brand-primary font-semibold mt-2 inline-flex items-center gap-1 hover:underline"
      >
        <Plus size={11} /> Add{" "}
        <span className="lowercase">{label.replace(/s$/, "")}</span>
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold flex items-center gap-2 mb-1.5">
        {label}
        {hint ? (
          <span className="text-[11px] font-normal text-brand-muted normal-case tracking-normal">
            · {hint}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

// Unused; kept for future "approve as-is" affordance.
void GlassBadge;
