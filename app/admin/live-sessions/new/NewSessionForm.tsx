"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * NewSessionForm — creates a free or paid live session.
 *
 * youtubeVideoId is left optional at create time — admin pastes it later
 * (from the manage page) once the broadcaster is actually live on YouTube.
 * Creating up front gives the team a shareable URL to put in pre-launch
 * marketing.
 *
 * startsAt is a datetime-local string; we convert to ISO before POST.
 */
export function NewSessionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tier, setTier] = useState<"free" | "paid">("free");
  const [startsAt, setStartsAt] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [youtubeVideoId, setYoutubeVideoId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    title.trim().length >= 3 &&
    startsAt.length > 0 &&
    durationMin >= 15 &&
    !submitting;

  async function submit(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/live-sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          startsAt: new Date(startsAt).toISOString(),
          durationMin,
          tier,
          youtubeVideoId: youtubeVideoId.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        id?: string;
        roomCode?: string;
        error?: string;
      };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Create failed");
      router.push(`/admin/live-sessions/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="rounded-2xl bg-white border border-brand-ink/10 p-6 sm:p-8 space-y-5"
    >
      <Field label="Title *">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. AI Resume Review — Live with Vikram"
          required
          maxLength={120}
          className="w-full rounded-xl border border-brand-ink/15 bg-white px-4 py-2.5 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
        />
      </Field>

      <Field
        label="Description"
        hint="One-liner shown on the landing-page teaser + /live page"
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What students will learn, who it's for…"
          maxLength={500}
          rows={3}
          className="w-full rounded-xl border border-brand-ink/15 bg-white px-4 py-2.5 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition resize-none"
        />
      </Field>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Starts at *">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
            className="w-full rounded-xl border border-brand-ink/15 bg-white px-4 py-2.5 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
          />
        </Field>
        <Field label="Duration (min)">
          <input
            type="number"
            min={15}
            max={360}
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-full rounded-xl border border-brand-ink/15 bg-white px-4 py-2.5 text-sm text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
          />
        </Field>
      </div>

      <Field
        label="Tier"
        hint="Free = anyone logged in. Paid = enrolled bootcamp students only."
      >
        <div className="flex gap-2">
          <TierPill
            label="Free webinar"
            active={tier === "free"}
            onClick={() => setTier("free")}
          />
          <TierPill
            label="Paid bootcamp"
            active={tier === "paid"}
            onClick={() => setTier("paid")}
          />
        </div>
      </Field>

      <Field
        label="YouTube video ID or URL"
        hint="Optional now — paste later from the manage page when the broadcaster goes live"
      >
        <input
          value={youtubeVideoId}
          onChange={(e) => setYoutubeVideoId(e.target.value)}
          placeholder="e.g. dQw4w9WgXcQ or full YouTube URL"
          className="w-full rounded-xl border border-brand-ink/15 bg-white px-4 py-2.5 text-sm font-mono text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
        />
      </Field>

      {error ? (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-brand-ink border border-brand-ink/10 hover:border-brand-ink/25 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary text-white px-5 py-2.5 text-sm font-semibold hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Creating…
            </>
          ) : (
            "Create session"
          )}
        </button>
      </div>
    </form>
  );
}

function TierPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
        active
          ? "bg-brand-primary text-white border-brand-primary"
          : "bg-white text-brand-ink border-brand-ink/15 hover:border-brand-ink/30"
      }`}
    >
      {label}
    </button>
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
      <span className="text-[12px] font-semibold text-brand-ink mb-1.5 inline-flex items-center gap-2">
        {label}
        {hint ? (
          <span className="text-[11px] font-normal text-brand-muted">
            · {hint}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}
