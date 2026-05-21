"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Radio,
  Users as UsersIcon,
  Play,
  StopCircle,
  Trash2,
  ExternalLink,
  Clock,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { LiveSession } from "@/shared/types";
import { GlassButton, GlassCard, GlassInput } from "@/components/glass";

interface Props {
  bootcamps: Array<{ id: string; title: string }>;
  initialSessions: LiveSession[];
}

export function LiveScheduleClient({ bootcamps, initialSessions }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState<LiveSession[]>(initialSessions);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    bootcampId: bootcamps[0]?.id ?? "",
    title: "",
    description: "",
    startsAt: defaultStart(),
    durationMin: 60,
  });

  async function create() {
    if (!form.bootcampId || !form.title || !form.startsAt) return;
    setBusy(true);
    const res = await fetch("/api/live", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      alert("Could not create session — check fields.");
      return;
    }
    const created = (await res.json()) as LiveSession;
    setSessions((s) => [...s, created].sort(byStart));
    setOpen(false);
    setForm({
      bootcampId: bootcamps[0]?.id ?? "",
      title: "",
      description: "",
      startsAt: defaultStart(),
      durationMin: 60,
    });
    router.refresh();
  }

  async function action(id: string, verb: "start" | "end" | "cancel") {
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
      // Open the room in same tab
      const s = sessions.find((x) => x.id === id);
      if (s) window.location.href = `/live/${s.roomCode}`;
    }
    router.refresh();
  }

  async function remove(id: string) {
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
        <GlassButton variant="brand" onClick={() => setOpen(true)}>
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
          {sessions.map((s) => (
            <GlassCard key={s.id} className="!p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusPill status={s.status} />
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
                    <span className="text-brand-primary font-semibold">
                      Code · {s.roomCode}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.status === "scheduled" && (
                    <>
                      <GlassButton
                        variant="brand"
                        size="sm"
                        onClick={() => action(s.id, "start")}
                      >
                        <Play size={12} /> Start
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
                      <Link
                        href={`/live/${s.roomCode}`}
                        className="btn-brand text-xs"
                      >
                        <ExternalLink size={12} /> Open room
                      </Link>
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
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-ink/30 backdrop-blur-sm px-4">
          <div className="glass-panel-strong w-full max-w-lg p-6 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 grid place-items-center w-8 h-8 rounded-lg text-brand-muted hover:text-brand-ink hover:bg-white/60"
            >
              <X size={16} />
            </button>
            <h2 className="font-display font-extrabold text-xl text-brand-ink mb-1">
              Schedule live session
            </h2>
            <p className="text-sm text-brand-muted mb-4">
              Students enrolled in the selected bootcamp will see this in their lobby.
            </p>
            <div className="space-y-3">
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
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <GlassButton variant="glass" onClick={() => setOpen(false)}>
                Cancel
              </GlassButton>
              <GlassButton variant="brand" onClick={create} disabled={busy}>
                {busy ? "Scheduling…" : "Schedule"}
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </>
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

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  // datetime-local format: YYYY-MM-DDTHH:mm
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
