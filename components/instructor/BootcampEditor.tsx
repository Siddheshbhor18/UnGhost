"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Eye,
  Loader2,
  Plus,
  Rocket,
  Save,
  Send,
  Video as VideoIcon,
  X,
} from "lucide-react";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  GlassSelect,
  GlassTextarea,
} from "@/components/glass";
import type {
  Bootcamp,
  BootcampCategory,
  BootcampStatus,
  BootcampVideo,
} from "@/shared/types";

interface Props {
  bootcamp: Bootcamp;
}

const CATEGORIES: Array<{ value: BootcampCategory; label: string }> = [
  { value: "ai", label: "AI / GenAI" },
  { value: "data_science", label: "Data Science" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finance" },
  { value: "sales", label: "Sales / BD" },
];

const STATUS_TONE: Record<
  BootcampStatus,
  "neutral" | "warn" | "success" | "brand" | "danger"
> = {
  draft: "neutral",
  in_review: "warn",
  published: "success",
  changes_requested: "danger",
  archived: "neutral",
};

export function BootcampEditor({ bootcamp }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<Bootcamp>(bootcamp);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{
    error?: string;
    missing?: string[];
  } | null>(null);
  const debounce = useRef<NodeJS.Timeout | null>(null);

  function patch<K extends keyof Bootcamp>(key: K, val: Bootcamp[K]) {
    setDraft((d) => {
      const next = { ...d, [key]: val };
      scheduleAutosave(next);
      return next;
    });
  }

  function scheduleAutosave(next: Bootcamp) {
    if (debounce.current) clearTimeout(debounce.current);
    setSavingState("saving");
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/instructor/bootcamps/${bootcamp.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: next.title,
            skill: next.skill,
            category: next.category,
            description: next.description,
            priceINR: next.priceINR,
            durationWeeks: next.durationWeeks,
            videos: next.videos,
            liveSlots: next.liveSlots,
          }),
        });
        setSavingState(res.ok ? "saved" : "idle");
        setTimeout(() => setSavingState("idle"), 1500);
      } catch {
        setSavingState("idle");
      }
    }, 700);
  }

  function addVideo() {
    const v: BootcampVideo = {
      id: `v_${Date.now().toString(36)}`,
      title: "",
      durationMin: 12,
      posterUrl: "",
      verifyPrompt: "",
    };
    patch("videos", [...(draft.videos ?? []), v]);
  }

  function updateVideo(id: string, field: keyof BootcampVideo, val: string | number) {
    patch(
      "videos",
      (draft.videos ?? []).map((v) =>
        v.id === id ? { ...v, [field]: val } : v,
      ),
    );
  }

  function removeVideo(id: string) {
    patch(
      "videos",
      (draft.videos ?? []).filter((v) => v.id !== id),
    );
  }

  function addLiveSlot() {
    // Default to one week from now at 6pm IST
    const next = new Date(Date.now() + 7 * 86400_000);
    next.setHours(18, 0, 0, 0);
    patch("liveSlots", [...(draft.liveSlots ?? []), next.toISOString()]);
  }

  function updateLiveSlot(idx: number, iso: string) {
    const next = [...(draft.liveSlots ?? [])];
    next[idx] = iso;
    patch("liveSlots", next);
  }

  function removeLiveSlot(idx: number) {
    patch(
      "liveSlots",
      (draft.liveSlots ?? []).filter((_, i) => i !== idx),
    );
  }

  async function submitForReview() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(
        `/api/instructor/bootcamps/${bootcamp.id}/submit`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data);
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  // Readiness checklist mirroring server-side check
  const missing: string[] = [];
  if (!draft.title?.trim()) missing.push("title");
  if (!draft.skill?.trim()) missing.push("skill");
  if (!draft.description?.trim() || draft.description.length < 100)
    missing.push("description (≥100 chars)");
  if ((draft.videos ?? []).length === 0) missing.push("at least 1 video");
  if (!draft.priceINR || draft.priceINR <= 0) missing.push("price");
  const isReady = missing.length === 0;

  const isPublished = draft.status === "published";
  const isInReview = draft.status === "in_review";
  const canSubmit =
    !isPublished && !isInReview && isReady;

  return (
    <div className="space-y-5">
      {/* Header + readiness sidebar */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/instructor/studio"
            className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-2"
          >
            <ChevronLeft size={14} /> Studio
          </Link>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <GlassBadge tone="warn">Edit bootcamp</GlassBadge>
            <GlassBadge tone={STATUS_TONE[draft.status ?? "draft"]}>
              {(draft.status ?? "draft").replace("_", " ")}
            </GlassBadge>
          </div>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink line-clamp-1">
            {draft.title || "Untitled bootcamp"}
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Auto-saves as you type · Submit for review when ready
          </p>
        </div>
        <div className="text-right">
          <SaveIndicator state={savingState} />
        </div>
      </div>

      {/* In-review notice */}
      {isInReview && (
        <GlassCard className="!p-4 bg-amber-500/5 border-amber-500/20">
          <p className="text-sm text-amber-800">
            <strong>Under admin review.</strong> Edits are locked until the
            review completes. Typical turnaround: 48 hours.
          </p>
        </GlassCard>
      )}

      {/* Changes requested notice */}
      {draft.status === "changes_requested" && draft.reviewFeedback && (
        <GlassCard className="!p-4 bg-rose-500/5 border-rose-500/20">
          <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold mb-1">
            Admin requested changes
          </p>
          <p className="text-sm text-brand-ink/90 leading-relaxed">
            {draft.reviewFeedback}
          </p>
        </GlassCard>
      )}

      {/* Basics */}
      <GlassCard className="space-y-4">
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
          Basics
        </p>
        <Field label="Title">
          <GlassInput
            value={draft.title}
            onChange={(e) => patch("title", e.target.value)}
            placeholder="e.g. LLM Grounding for Production Engineers"
            disabled={isInReview}
            maxLength={80}
          />
        </Field>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Primary skill">
            <GlassInput
              value={draft.skill}
              onChange={(e) => patch("skill", e.target.value)}
              placeholder="LLM Grounding"
              disabled={isInReview}
              maxLength={40}
            />
          </Field>
          <Field label="Category">
            <GlassSelect
              value={draft.category}
              onChange={(e) =>
                patch("category", e.target.value as BootcampCategory)
              }
              disabled={isInReview}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </GlassSelect>
          </Field>
          <Field label="Price (₹)">
            <GlassInput
              type="number"
              min={0}
              max={99999}
              value={draft.priceINR}
              onChange={(e) => patch("priceINR", Number(e.target.value))}
              disabled={isInReview}
            />
          </Field>
          <Field label="Duration (weeks)">
            <GlassInput
              type="number"
              min={1}
              max={52}
              value={draft.durationWeeks}
              onChange={(e) =>
                patch("durationWeeks", Number(e.target.value))
              }
              disabled={isInReview}
            />
          </Field>
        </div>
        <Field
          label={`Description (${draft.description?.length ?? 0} / 100+ chars)`}
        >
          <GlassTextarea
            value={draft.description}
            onChange={(e) => patch("description", e.target.value)}
            rows={5}
            placeholder="What students will learn · who it's for · what they walk away with."
            disabled={isInReview}
          />
        </Field>
      </GlassCard>

      {/* Videos */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
              Video lessons ({(draft.videos ?? []).length})
            </p>
            <p className="text-xs text-brand-muted mt-0.5">
              Each lesson ends with a skill-check quiz. 70% to pass.
            </p>
          </div>
          <GlassButton
            variant="glass"
            size="sm"
            onClick={addVideo}
            disabled={isInReview}
          >
            <Plus size={12} /> Add lesson
          </GlassButton>
        </div>
        {(draft.videos ?? []).length === 0 ? (
          <p className="text-sm text-brand-muted text-center py-6">
            No lessons yet. Add at least one before submitting for review.
          </p>
        ) : (
          <div className="space-y-3">
            {(draft.videos ?? []).map((v, idx) => (
              <div
                key={v.id}
                className="rounded-2xl bg-white/40 border border-brand-ink/5 p-4"
              >
                <div className="flex items-start gap-2 mb-2">
                  <VideoIcon
                    size={14}
                    className="text-brand-primary mt-1 shrink-0"
                  />
                  <p className="text-xs font-semibold text-brand-muted">
                    Lesson {idx + 1}
                  </p>
                  <button
                    onClick={() => removeVideo(v.id)}
                    disabled={isInReview}
                    className="ml-auto text-brand-muted hover:text-rose-600 disabled:opacity-30"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="grid md:grid-cols-[1fr_auto] gap-2 mb-2">
                  <GlassInput
                    value={v.title}
                    onChange={(e) =>
                      updateVideo(v.id, "title", e.target.value)
                    }
                    placeholder="Lesson title"
                    disabled={isInReview}
                  />
                  <GlassInput
                    type="number"
                    min={1}
                    max={120}
                    value={v.durationMin}
                    onChange={(e) =>
                      updateVideo(v.id, "durationMin", Number(e.target.value))
                    }
                    placeholder="min"
                    disabled={isInReview}
                    className="md:w-24"
                  />
                </div>
                <GlassTextarea
                  value={v.verifyPrompt}
                  onChange={(e) =>
                    updateVideo(v.id, "verifyPrompt", e.target.value)
                  }
                  rows={2}
                  placeholder="Skill-check prompt — what the AI grades students on."
                  disabled={isInReview}
                />
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Live slots */}
      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold">
              Live session slots ({(draft.liveSlots ?? []).length})
            </p>
            <p className="text-xs text-brand-muted mt-0.5">
              Module 3 of every bootcamp. 60 min via 100ms.live · min 5 RSVPs.
            </p>
          </div>
          <GlassButton
            variant="glass"
            size="sm"
            onClick={addLiveSlot}
            disabled={isInReview}
          >
            <Plus size={12} /> Add slot
          </GlassButton>
        </div>
        {(draft.liveSlots ?? []).length === 0 ? (
          <p className="text-sm text-brand-muted text-center py-6">
            No live slots scheduled.
          </p>
        ) : (
          <ul className="space-y-2">
            {(draft.liveSlots ?? []).map((iso, idx) => {
              const local = (() => {
                try {
                  const d = new Date(iso);
                  // datetime-local needs YYYY-MM-DDTHH:mm
                  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                } catch {
                  return "";
                }
              })();
              return (
                <li
                  key={idx}
                  className="flex items-center gap-2 rounded-xl bg-white/40 border border-brand-ink/5 p-3"
                >
                  <Calendar size={13} className="text-brand-primary" />
                  <input
                    type="datetime-local"
                    value={local}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) updateLiveSlot(idx, new Date(v).toISOString());
                    }}
                    disabled={isInReview}
                    className="glass-input flex-1"
                  />
                  <button
                    onClick={() => removeLiveSlot(idx)}
                    disabled={isInReview}
                    className="text-brand-muted hover:text-rose-600 disabled:opacity-30"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>

      {/* Readiness + submit */}
      <GlassCard
        className={`!p-5 ${
          isReady
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-amber-500/5 border-amber-500/20"
        }`}
      >
        <p className="text-[10px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
          {isReady ? (
            <>
              <CheckCircle2 size={11} className="text-emerald-600" />
              <span className="text-emerald-700">Ready to submit</span>
            </>
          ) : (
            <>
              <AlertTriangle size={11} className="text-amber-600" />
              <span className="text-amber-700">
                {missing.length} item{missing.length === 1 ? "" : "s"} missing
              </span>
            </>
          )}
        </p>

        {!isReady && (
          <ul className="space-y-1 mb-4">
            {missing.map((m) => (
              <li
                key={m}
                className="text-sm text-brand-ink/85 flex items-start gap-1.5"
              >
                <X size={12} className="text-rose-600 mt-0.5 shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        )}

        {submitError && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 mb-3">
            <p className="text-sm text-rose-800 font-semibold">
              {submitError.error}
            </p>
            {submitError.missing && (
              <ul className="text-xs text-rose-700 mt-1 ml-4 list-disc">
                {submitError.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/bootcamp/${draft.id}`}
            className="btn-glass"
          >
            <Eye size={12} /> Preview public page
          </Link>
          {isPublished ? (
            <GlassBadge tone="success" className="!px-4 !py-2">
              <Rocket size={11} /> Live
            </GlassBadge>
          ) : (
            <GlassButton
              variant="brand"
              size="md"
              onClick={submitForReview}
              disabled={!canSubmit || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={12} className="animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send size={12} /> Submit for admin review
                </>
              )}
            </GlassButton>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-brand-muted font-semibold">
        <Loader2 size={12} className="animate-spin" /> Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
        <Save size={12} /> Saved
      </span>
    );
  return (
    <span className="text-[10px] text-brand-muted">
      Auto-saves as you type
    </span>
  );
}
