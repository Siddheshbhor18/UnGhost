"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Film,
  HardDrive,
  Loader2,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import type { SessionRecording } from "@/shared/types";
import clsx from "clsx";

interface Props {
  initial: SessionRecording[];
}

/**
 * Two-section layout:
 *   - Pending review (instructor decides Keep/Delete)
 *   - Library (already-kept clips, with a Delete-anyway option)
 *
 * All mutations PATCH/DELETE to /api/instructor/recordings/[id]. After each
 * mutation we splice the local state so the user sees an instant update,
 * then router.refresh() to re-validate from the server.
 */
export function RecordingsClient({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<SessionRecording[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = useMemo(
    () => items.filter((r) => r.status === "pending_review"),
    [items],
  );
  const kept = useMemo(
    () => items.filter((r) => r.status === "published"),
    [items],
  );

  async function publish(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/instructor/recordings/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't keep this recording.");
        return;
      }
      setItems((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, status: "published", publishedAt: data.publishedAt }
            : r,
        ),
      );
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function destroy(id: string) {
    if (!confirm("Delete this recording? Cannot be undone.")) return;
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/instructor/recordings/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't delete this recording.");
        return;
      }
      // Drop from local state — even though the row stays in DB as 'deleted',
      // the API filters those out and so should we.
      setItems((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {error ? (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          {error}
        </div>
      ) : null}

      {pending.length > 0 ? (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <GlassBadge tone="warn">Pending review · {pending.length}</GlassBadge>
            <p className="text-xs text-brand-muted">
              Decide what to do — Keep or Delete.
            </p>
          </div>
          <ul className="space-y-3">
            {pending.map((r) => (
              <RecordingCard
                key={r.id}
                rec={r}
                busy={busyId === r.id}
                actions={
                  <>
                    <GlassButton
                      variant="brand"
                      size="sm"
                      onClick={() => publish(r.id)}
                      disabled={busyId !== null}
                    >
                      {busyId === r.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={12} />
                      )}
                      Keep
                    </GlassButton>
                    <GlassButton
                      variant="glass"
                      size="sm"
                      onClick={() => destroy(r.id)}
                      disabled={busyId !== null}
                      className="!text-rose-700"
                    >
                      <Trash2 size={12} /> Delete
                    </GlassButton>
                  </>
                }
              />
            ))}
          </ul>
        </section>
      ) : null}

      {kept.length > 0 ? (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <GlassBadge tone="success">
              Library · {kept.length}
            </GlassBadge>
            <p className="text-xs text-brand-muted">
              Available to enrolled students inside the bootcamp page.
            </p>
          </div>
          <ul className="space-y-3">
            {kept.map((r) => (
              <RecordingCard
                key={r.id}
                rec={r}
                busy={busyId === r.id}
                actions={
                  <>
                    {r.playbackUrl ? (
                      <a
                        href={r.playbackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
                      >
                        <PlayCircle size={13} /> Watch
                      </a>
                    ) : null}
                    <GlassButton
                      variant="glass"
                      size="sm"
                      onClick={() => destroy(r.id)}
                      disabled={busyId !== null}
                      className="!text-rose-700"
                    >
                      <Trash2 size={12} /> Delete
                    </GlassButton>
                  </>
                }
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RecordingCard({
  rec,
  busy,
  actions,
}: {
  rec: SessionRecording;
  busy: boolean;
  actions: React.ReactNode;
}) {
  return (
    <li>
      <GlassCard
        className={clsx("!p-4", busy && "opacity-60 pointer-events-none")}
      >
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-32 h-20 rounded-xl bg-brand-gradient grid place-items-center text-white shrink-0 overflow-hidden">
            {rec.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={rec.thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <Film size={28} className="opacity-80" />
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <p className="font-display font-bold text-brand-ink line-clamp-1">
              {rec.sessionTitle}
            </p>
            <p className="text-xs text-brand-muted mt-0.5 line-clamp-1">
              {rec.bootcampTitle}
            </p>
            <div className="flex flex-wrap gap-3 text-[11px] text-brand-muted mt-2">
              <span className="inline-flex items-center gap-1">
                <Clock size={11} /> {fmtDuration(rec.durationSec)}
              </span>
              <span className="inline-flex items-center gap-1">
                <HardDrive size={11} /> {fmtSize(rec.sizeBytes)}
              </span>
              <span>
                Recorded{" "}
                {new Date(rec.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {actions}
          </div>
        </div>
      </GlassCard>
    </li>
  );
}

function fmtDuration(sec?: number) {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}m ${s}s`;
}

function fmtSize(bytes?: number) {
  if (!bytes) return "—";
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  if (bytes > 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
  return `${bytes} B`;
}
