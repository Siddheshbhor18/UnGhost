"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  PlayCircle,
  Save,
  StopCircle,
  XCircle,
} from "lucide-react";

/**
 * ManageSessionClient — admin controls for a single live session.
 *
 * Two areas:
 *   1. Status transitions (top, prominent) — paste video ID + Go Live,
 *      then End session. Most-used controls live here.
 *   2. Edit details (collapsible, lower priority) — title/description/etc.
 *
 * All actions PATCH /api/admin/live-sessions/[id]. Status changes show
 * inline confirmation; the page reloads on success so admin sees the new
 * state without ambiguity.
 */

interface Initial {
  title: string;
  description: string;
  startsAt: string;
  durationMin: number;
  status: string;
  youtubeVideoId: string;
  recordingUrl: string;
}

interface Stats {
  attendeeCount: number;
  messageCount: number;
}

interface Props {
  id: string;
  roomCode: string;
  initial: Initial;
  stats: Stats;
}

export function ManageSessionClient({ id, roomCode, initial, stats }: Props) {
  const router = useRouter();
  const [videoIdInput, setVideoIdInput] = useState(initial.youtubeVideoId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(
    body: Record<string, unknown>,
    label: string,
  ): Promise<void> {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(`/api/admin/live-sessions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Update failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  const isLive = initial.status === "live";
  const isEnded =
    initial.status === "ended" || initial.status === "cancelled";

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Status" value={initial.status} tone={initial.status} />
        <StatCard label="Attendees" value={String(stats.attendeeCount)} />
        <StatCard label="Chat messages" value={String(stats.messageCount)} />
      </div>

      {/* Go Live / End controls */}
      {!isEnded ? (
        <section className="rounded-2xl bg-white border border-brand-ink/10 p-6">
          <h2 className="font-display font-bold text-brand-ink mb-1">
            Broadcast controls
          </h2>
          <p className="text-xs text-brand-muted mb-4">
            Step 1 — paste the YouTube video ID once the broadcaster is up on
            YouTube. Step 2 — click <strong>Go Live</strong> to flip the public
            page to streaming mode. Step 3 — click <strong>End session</strong>{" "}
            when done.
          </p>

          <label className="block mb-3">
            <span className="text-[12px] font-semibold text-brand-ink mb-1.5 block">
              YouTube video ID or share URL
            </span>
            <div className="flex gap-2">
              <input
                value={videoIdInput}
                onChange={(e) => setVideoIdInput(e.target.value)}
                placeholder="e.g. dQw4w9WgXcQ or https://youtu.be/dQw4w9WgXcQ"
                className="flex-1 rounded-xl border border-brand-ink/15 bg-white px-4 py-2.5 text-sm font-mono text-brand-ink focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_3px_rgba(1,145,252,0.12)] transition"
              />
              <button
                onClick={() =>
                  patch({ youtubeVideoId: videoIdInput.trim() }, "save-id")
                }
                disabled={!videoIdInput.trim() || busy !== null}
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-ink/15 bg-white text-brand-ink px-4 py-2.5 text-sm font-semibold hover:border-brand-primary hover:text-brand-primary disabled:opacity-50 transition"
              >
                {busy === "save-id" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save
              </button>
            </div>
          </label>

          <div className="flex flex-wrap gap-2 pt-3 border-t border-brand-ink/5">
            {!isLive ? (
              <ActionBtn
                onClick={() => patch({ status: "live" }, "go-live")}
                disabled={!initial.youtubeVideoId || busy !== null}
                spinning={busy === "go-live"}
                icon={<PlayCircle size={14} />}
                label="Go Live"
                tone="brand"
                hint={
                  !initial.youtubeVideoId
                    ? "Save a video ID first"
                    : undefined
                }
              />
            ) : (
              <ActionBtn
                onClick={() => patch({ status: "ended" }, "end")}
                disabled={busy !== null}
                spinning={busy === "end"}
                icon={<StopCircle size={14} />}
                label="End session"
                tone="rose"
              />
            )}
            <ActionBtn
              onClick={() => patch({ status: "cancelled" }, "cancel")}
              disabled={busy !== null}
              spinning={busy === "cancel"}
              icon={<XCircle size={14} />}
              label="Cancel session"
              tone="neutral"
            />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6">
          <h2 className="font-display font-bold text-emerald-900 flex items-center gap-2 mb-2">
            <CheckCircle2 size={18} /> Session ended
          </h2>
          <p className="text-sm text-emerald-900/80">
            The public page now shows the recording (or a "coming soon"
            placeholder if no recording URL is set).
          </p>
          {!initial.recordingUrl ? (
            <div className="mt-4">
              <label className="block">
                <span className="text-[12px] font-semibold text-emerald-900 mb-1.5 block">
                  Optional: paste a recording URL (Drive / YouTube / R2)
                </span>
                <RecordingUrlInput
                  onSave={(url) => patch({ recordingUrl: url }, "rec-url")}
                  saving={busy === "rec-url"}
                />
              </label>
            </div>
          ) : null}
        </section>
      )}

      {error ? (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          {error}
        </div>
      ) : null}

      {/* Quick-link to public page */}
      <a
        href={`/live/${roomCode}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-sm font-semibold text-brand-primary hover:underline"
      >
        Preview the public page →
      </a>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  const valueColor =
    tone === "live"
      ? "text-rose-600"
      : tone === "scheduled"
        ? "text-amber-600"
        : tone === "ended"
          ? "text-emerald-600"
          : "text-brand-ink";
  return (
    <div className="rounded-xl bg-white border border-brand-ink/10 p-4">
      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
        {label}
      </p>
      <p
        className={`font-display font-extrabold text-2xl mt-1 capitalize tnum ${valueColor}`}
      >
        {value}
      </p>
    </div>
  );
}

function ActionBtn({
  onClick,
  disabled,
  spinning,
  icon,
  label,
  tone,
  hint,
}: {
  onClick: () => void;
  disabled: boolean;
  spinning: boolean;
  icon: React.ReactNode;
  label: string;
  tone: "brand" | "rose" | "neutral";
  hint?: string;
}) {
  const cls =
    tone === "brand"
      ? "bg-brand-primary text-white hover:bg-brand-primary/90"
      : tone === "rose"
        ? "bg-rose-600 text-white hover:bg-rose-700"
        : "bg-white text-brand-ink border border-brand-ink/15 hover:border-brand-ink/30";
  return (
    <div className="flex flex-col">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${cls}`}
      >
        {spinning ? <Loader2 size={14} className="animate-spin" /> : icon}
        {label}
      </button>
      {hint ? (
        <span className="text-[10px] text-brand-muted mt-1 ml-1">{hint}</span>
      ) : null}
    </div>
  );
}

function RecordingUrlInput({
  onSave,
  saving,
}: {
  onSave: (url: string) => void;
  saving: boolean;
}) {
  const [url, setUrl] = useState("");
  return (
    <div className="flex gap-2">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        type="url"
        placeholder="https://..."
        className="flex-1 rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm text-brand-ink focus:outline-none focus:border-emerald-500 transition"
      />
      <button
        onClick={() => onSave(url.trim())}
        disabled={!url.trim() || saving}
        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save
      </button>
    </div>
  );
}
