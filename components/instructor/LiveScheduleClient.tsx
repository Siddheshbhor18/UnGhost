"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Radio,
  Users as UsersIcon,
  Pencil,
  Play,
  StopCircle,
  Trash2,
  ExternalLink,
  Clock,
  ImagePlus,
  Loader2,
  Lock,
  MonitorPlay,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { LiveSession, LiveSessionType } from "@/shared/types";
import { GlassButton, GlassCard, GlassInput } from "@/components/glass";

interface Props {
  bootcamps: Array<{ id: string; title: string }>;
  initialSessions: LiveSession[];
}

interface SessionForm {
  bootcampId: string;
  title: string;
  description: string;
  startsAt: string;
  durationMin: number;
  sessionType: LiveSessionType;
  externalJoinUrl: string;
  thumbnailUrl: string;
  previewVideoUrl: string;
}

/** null = modal closed; "create" = new session; LiveSession = editing it. */
type ModalState = null | "create" | LiveSession;

const HTTPS_RE = /^https:\/\//i;

export function LiveScheduleClient({ bootcamps, initialSessions }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState<LiveSession[]>(initialSessions);
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<SessionForm>(emptyForm(bootcamps));

  const editing = modal !== null && modal !== "create" ? modal : null;
  const isEdit = editing !== null;
  const isExternal = form.sessionType === "external";
  const linkTrimmed = form.externalJoinUrl.trim();
  // Create requires a link; edit may leave it blank to keep the current one.
  const linkOk = isEdit
    ? linkTrimmed === "" || HTTPS_RE.test(linkTrimmed)
    : HTTPS_RE.test(linkTrimmed);
  const canSubmit =
    Boolean(form.bootcampId && form.title && form.startsAt) &&
    (!isExternal || linkOk);

  function openCreate(): void {
    setForm(emptyForm(bootcamps));
    setModal("create");
  }

  function openEdit(s: LiveSession): void {
    setForm({
      bootcampId: s.bootcampId ?? bootcamps[0]?.id ?? "",
      title: s.title,
      description: s.description ?? "",
      startsAt: toLocalInput(s.startsAt),
      durationMin: s.durationMin,
      sessionType: "external",
      externalJoinUrl: "", // secret is server-only; blank = keep current
      thumbnailUrl: s.thumbnailUrl ?? "",
      previewVideoUrl: s.previewVideoUrl ?? "",
    });
    setModal(s);
  }

  async function submit(): Promise<void> {
    if (!canSubmit || busy) return;
    setBusy(true);
    const ok = editing ? await saveEdit(editing) : await saveCreate();
    setBusy(false);
    if (ok) {
      setModal(null);
      router.refresh();
    } else {
      alert("Could not save session — check fields.");
    }
  }

  async function saveCreate(): Promise<boolean> {
    const payload: Record<string, unknown> = {
      bootcampId: form.bootcampId,
      title: form.title,
      description: form.description,
      startsAt: new Date(form.startsAt).toISOString(),
      durationMin: form.durationMin,
      sessionType: form.sessionType,
    };
    if (isExternal) {
      payload.externalJoinUrl = linkTrimmed;
      if (form.thumbnailUrl.trim()) payload.thumbnailUrl = form.thumbnailUrl.trim();
      if (form.previewVideoUrl.trim())
        payload.previewVideoUrl = form.previewVideoUrl.trim();
    }
    const res = await fetch("/api/live", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    const created = (await res.json()) as LiveSession;
    setSessions((s) => [...s, created].sort(byStart));
    return true;
  }

  async function saveEdit(target: LiveSession): Promise<boolean> {
    const payload: Record<string, unknown> = {
      action: "updateExternal",
      title: form.title,
      description: form.description,
      startsAt: new Date(form.startsAt).toISOString(),
      durationMin: form.durationMin,
    };
    // Blank link = keep the stored one (it never round-trips to the client).
    if (linkTrimmed) payload.externalJoinUrl = linkTrimmed;
    if (form.thumbnailUrl.trim()) payload.thumbnailUrl = form.thumbnailUrl.trim();
    if (form.previewVideoUrl.trim())
      payload.previewVideoUrl = form.previewVideoUrl.trim();
    const res = await fetch(`/api/live/${target.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return false;
    setSessions((list) =>
      list.map((s) =>
        s.id === target.id
          ? {
              ...s,
              title: form.title,
              description: form.description,
              startsAt: new Date(form.startsAt).toISOString(),
              durationMin: form.durationMin,
              thumbnailUrl: form.thumbnailUrl.trim() || s.thumbnailUrl,
              previewVideoUrl: form.previewVideoUrl.trim() || s.previewVideoUrl,
            }
          : s,
      ),
    );
    return true;
  }

  async function action(id: string, verb: "start" | "end" | "cancel"): Promise<void> {
    if (verb !== "start" && !confirm(`Really ${verb} this session?`)) return;
    const res = await fetch(`/api/live/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: verb }),
    });
    if (!res.ok) {
      alert("Action failed.");
      return;
    }
    const data = await res.json();
    setSessions((list) =>
      list.map((s) => (s.id === id ? { ...s, status: data.status } : s)),
    );
    if (verb === "start") {
      const s = sessions.find((x) => x.id === id);
      if (s && (s.sessionType ?? "unghost") === "external") {
        // No on-platform room for external sessions — open the meeting via
        // the masked join route in a fresh tab and keep the console here.
        window.open(`/api/live/${s.id}/join`, "_blank", "noopener,noreferrer");
      } else if (s) {
        window.location.href = `/live/${s.roomCode}`;
      }
    }
    router.refresh();
  }

  async function remove(id: string): Promise<void> {
    if (!confirm("Delete this session?")) return;
    const res = await fetch(`/api/live/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setSessions((s) => s.filter((x) => x.id !== id));
  }

  const bootcampLabel = (id: string) =>
    bootcamps.find((b) => b.id === id)?.title ?? "Bootcamp";

  return (
    <>
      <div className="flex justify-end mb-4">
        <GlassButton variant="brand" onClick={openCreate}>
          <CalendarPlus size={14} /> Schedule session
        </GlassButton>
      </div>

      {sessions.length === 0 ? (
        <GlassCard className="!p-8 text-center">
          <Radio size={28} className="mx-auto text-brand-muted mb-3" />
          <p className="font-display font-bold text-brand-ink">
            No sessions scheduled yet
          </p>
          <p className="text-sm text-brand-muted mt-2">
            Click <span className="text-brand-primary font-semibold">Schedule session</span> to set up your first live room.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const external = (s.sessionType ?? "unghost") === "external";
            return (
              <GlassCard key={s.id} className="!p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusPill status={s.status} />
                      {external && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 border border-violet-500/20 text-[10px] font-semibold uppercase tracking-wider">
                          <MonitorPlay size={10} /> External
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-wider text-brand-muted">
                        {bootcampLabel(s.bootcampId ?? "")}
                      </span>
                    </div>
                    <p className="font-display font-bold text-brand-ink">
                      {s.title}
                    </p>
                    {s.description && (
                      <p className="text-sm text-brand-muted mt-1 line-clamp-2">
                        {s.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-brand-muted">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDateTime(s.startsAt)} · {s.durationMin}m
                      </span>
                      <span className="flex items-center gap-1">
                        <UsersIcon size={11} />
                        {s.registeredStudentIds.length} registered
                      </span>
                      {external ? (
                        <span className="inline-flex items-center gap-1 text-violet-700 font-semibold">
                          <Lock size={10} /> Link hidden from students
                        </span>
                      ) : (
                        <span className="text-brand-primary font-semibold">
                          Code · {s.roomCode}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {external &&
                      (s.status === "scheduled" || s.status === "live") && (
                        <button
                          onClick={() => openEdit(s)}
                          className="grid place-items-center w-8 h-8 rounded-lg text-brand-muted hover:text-brand-primary hover:bg-brand-primary/10 transition"
                          title="Edit session details or replace the link"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    {s.status === "scheduled" && (
                      <>
                        <GlassButton
                          variant="brand"
                          size="sm"
                          onClick={() => action(s.id, "start")}
                        >
                          <Play size={12} /> {external ? "Go live" : "Start"}
                        </GlassButton>
                        <button
                          onClick={() => action(s.id, "cancel")}
                          className="grid place-items-center w-8 h-8 rounded-lg text-brand-muted hover:text-amber-600 hover:bg-amber-500/10 transition"
                          title="Cancel session"
                        >
                          <X size={14} />
                        </button>
                        <button
                          onClick={() => remove(s.id)}
                          className="grid place-items-center w-8 h-8 rounded-lg text-brand-muted hover:text-rose-600 hover:bg-rose-500/10 transition"
                          title="Delete session"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    {s.status === "live" && (
                      <>
                        {external ? (
                          <a
                            href={`/api/live/${s.id}/join`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-brand text-xs"
                          >
                            <ExternalLink size={12} /> Open session
                          </a>
                        ) : (
                          <Link
                            href={`/live/${s.roomCode}`}
                            className="btn-brand text-xs"
                          >
                            <ExternalLink size={12} /> Open room
                          </Link>
                        )}
                        <GlassButton
                          variant="glass"
                          size="sm"
                          onClick={() => action(s.id, "end")}
                        >
                          <StopCircle size={12} /> End
                        </GlassButton>
                      </>
                    )}
                    {s.status === "ended" && (
                      <span className="text-xs text-brand-muted">
                        Ended · {s.attendedStudentIds.length} attended
                      </span>
                    )}
                    {s.status === "cancelled" && (
                      <span className="text-xs text-brand-muted">Cancelled</span>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-ink/30 backdrop-blur-sm px-4">
          <div className="glass-panel-strong w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModal(null)}
              className="absolute top-3 right-3 grid place-items-center w-8 h-8 rounded-lg text-brand-muted hover:text-brand-ink hover:bg-white/60"
            >
              <X size={16} />
            </button>
            <h2 className="font-display font-extrabold text-xl text-brand-ink mb-1">
              {isEdit ? "Edit external session" : "Schedule live session"}
            </h2>
            <p className="text-sm text-brand-muted mb-4">
              {isEdit
                ? "Update the details or paste a new meeting link — students keep the same card."
                : "Students enrolled in the selected bootcamp will see this in their lobby."}
            </p>

            {!isEdit && (
              <div
                role="radiogroup"
                aria-label="Where will this session run?"
                className="grid grid-cols-2 gap-2 mb-4"
              >
                <HostOption
                  selected={!isExternal}
                  icon={<Radio size={16} />}
                  title="Host on unGhost"
                  caption="Built-in live room with chat"
                  onSelect={() =>
                    setForm((f) => ({ ...f, sessionType: "unghost" }))
                  }
                />
                <HostOption
                  selected={isExternal}
                  icon={<MonitorPlay size={16} />}
                  title="External platform"
                  caption="Zoho Meet, Google Meet…"
                  onSelect={() =>
                    setForm((f) => ({ ...f, sessionType: "external" }))
                  }
                />
              </div>
            )}

            <div className="space-y-3">
              {!isEdit && (
                <div>
                  <label className="text-xs font-semibold text-brand-muted mb-1 block">
                    Bootcamp
                  </label>
                  <select
                    className="glass-input w-full"
                    value={form.bootcampId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bootcampId: e.target.value }))
                    }
                  >
                    {bootcamps.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-brand-muted mb-1 block">
                  Title
                </label>
                <GlassInput
                  placeholder="e.g. Week 3 Q&A · System Design Deep Dive"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-muted mb-1 block">
                  Short description (optional)
                </label>
                <textarea
                  rows={3}
                  className="glass-input w-full resize-none"
                  placeholder="What you'll cover…"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-brand-muted mb-1 block">
                    Starts at
                  </label>
                  <GlassInput
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, startsAt: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-brand-muted mb-1 block">
                    Duration (min)
                  </label>
                  <GlassInput
                    type="number"
                    min={15}
                    max={240}
                    value={form.durationMin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        durationMin: Number(e.target.value) || 60,
                      }))
                    }
                  />
                </div>
              </div>

              {isExternal && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-brand-muted mb-1 block">
                      Session link{isEdit ? " (leave blank to keep current)" : ""}
                    </label>
                    <GlassInput
                      type="url"
                      placeholder={
                        isEdit
                          ? "Paste only to replace the stored link"
                          : "https://meet.zoho.com/…"
                      }
                      value={form.externalJoinUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, externalJoinUrl: e.target.value }))
                      }
                      aria-invalid={linkTrimmed.length > 0 && !HTTPS_RE.test(linkTrimmed)}
                    />
                    {linkTrimmed.length > 0 && !HTTPS_RE.test(linkTrimmed) && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        Must be an https:// link.
                      </p>
                    )}
                  </div>
                  <ThumbnailField
                    value={form.thumbnailUrl}
                    onChange={(url) =>
                      setForm((f) => ({ ...f, thumbnailUrl: url }))
                    }
                  />
                  <div>
                    <label className="text-xs font-semibold text-brand-muted mb-1 block">
                      Preview video URL (optional)
                    </label>
                    <GlassInput
                      type="url"
                      placeholder="https://… (teaser students can watch)"
                      value={form.previewVideoUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, previewVideoUrl: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-3 py-2.5">
                    <Lock size={13} className="mt-0.5 shrink-0 text-violet-700" />
                    <p className="text-[11px] leading-relaxed text-violet-900">
                      The link stays hidden. Students join through unGhost —
                      they never see or copy the raw meeting URL.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <GlassButton variant="glass" onClick={() => setModal(null)}>
                Cancel
              </GlassButton>
              <GlassButton variant="brand" onClick={submit} disabled={busy || !canSubmit}>
                {busy ? "Saving…" : isEdit ? "Save changes" : "Schedule"}
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Thumbnail input: paste an https URL, or upload a PNG/JPEG/WebP straight to
 * storage through the instructor presign flow (kind: "image"). Upload fills
 * the same field, so downstream handling is identical either way.
 */
function ThumbnailField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File): Promise<void> {
    setErr(null);
    setPct(0);
    try {
      const presignRes = await fetch("/api/instructor/upload-video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentType: file.type,
          filename: file.name,
          sizeBytes: file.size,
          kind: "image",
        }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => ({}));
        throw new Error(data.error ?? `presign failed (${presignRes.status})`);
      }
      const { uploadUrl, publicUrl, headers } = (await presignRes.json()) as {
        uploadUrl: string;
        publicUrl: string;
        headers: Record<string, string>;
      };
      // XHR (not fetch) for upload progress events — same pattern as the
      // lesson-video uploader in BootcampEditor.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        for (const [k, v] of Object.entries(headers)) {
          xhr.setRequestHeader(k, v);
        }
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setPct(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`upload HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("network error"));
        xhr.send(file);
      });
      onChange(publicUrl);
      setPct(null);
    } catch (e) {
      setPct(null);
      setErr((e as Error).message);
    }
  }

  return (
    <div>
      <label className="text-xs font-semibold text-brand-muted mb-1 block">
        Thumbnail (optional)
      </label>
      <div className="flex items-center gap-2">
        <GlassInput
          type="url"
          className="flex-1"
          placeholder="https://… or upload a file"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
        <GlassButton
          variant="glass"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={pct !== null}
        >
          {pct !== null ? (
            <>
              <Loader2 size={12} className="animate-spin" /> {pct}%
            </>
          ) : (
            <>
              <ImagePlus size={12} /> Upload
            </>
          )}
        </GlassButton>
      </div>
      {err && <p className="text-[11px] text-rose-600 mt-1">Upload failed: {err}</p>}
      {value && !err && pct === null && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Thumbnail preview"
          className="mt-2 h-20 rounded-lg border border-brand-ink/10 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
    </div>
  );
}

function HostOption({
  selected,
  icon,
  title,
  caption,
  onSelect,
}: {
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  caption: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={clsx(
        "rounded-xl border px-3 py-2.5 text-left transition",
        selected
          ? "border-brand-primary bg-brand-primary/5 shadow-sm"
          : "border-brand-ink/10 hover:border-brand-ink/25",
      )}
    >
      <span
        className={clsx(
          "flex items-center gap-1.5 text-sm font-semibold",
          selected ? "text-brand-primary" : "text-brand-ink",
        )}
      >
        {icon}
        {title}
      </span>
      <span className="mt-0.5 block text-[11px] text-brand-muted">{caption}</span>
    </button>
  );
}

function StatusPill({ status }: { status: LiveSession["status"] }) {
  const map = {
    scheduled: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
    live: "bg-rose-500/15 text-rose-700 border-rose-500/30 animate-pulse",
    ended: "bg-brand-ink/5 text-brand-muted border-brand-ink/10",
    cancelled: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  } as const;
  const label = {
    scheduled: "Scheduled",
    live: "● Live now",
    ended: "Ended",
    cancelled: "Cancelled",
  } as const;
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider",
        map[status],
      )}
    >
      {label[status]}
    </span>
  );
}

function emptyForm(bootcamps: Array<{ id: string; title: string }>): SessionForm {
  return {
    bootcampId: bootcamps[0]?.id ?? "",
    title: "",
    description: "",
    startsAt: defaultStart(),
    durationMin: 60,
    sessionType: "unghost",
    externalJoinUrl: "",
    thumbnailUrl: "",
    previewVideoUrl: "",
  };
}

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return toLocalInput(d.toISOString());
}

/** ISO timestamp → the `YYYY-MM-DDTHH:mm` shape datetime-local expects. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function byStart(a: LiveSession, b: LiveSession): number {
  return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
