"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Radio,
  Clock,
  Users as UsersIcon,
  Check,
  ExternalLink,
  MonitorPlay,
  Bell,
  BellOff,
} from "lucide-react";
import clsx from "clsx";
import type { LiveSession } from "@/shared/types";
import { GlassButton, GlassCard } from "@/components/glass";

type SessionWithTitle = LiveSession & { bootcampTitle: string };

interface Props {
  sessions: SessionWithTitle[];
  studentId: string;
}

export function StudentLiveLobby({ sessions, studentId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<SessionWithTitle[]>(sessions);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleRegister(s: SessionWithTitle) {
    const isReg = s.registeredStudentIds.includes(studentId);
    setBusyId(s.id);
    const res = await fetch(`/api/live/${s.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: isReg ? "unregister" : "register" }),
    });
    setBusyId(null);
    if (!res.ok) return;
    setState((list) =>
      list.map((x) =>
        x.id === s.id
          ? {
              ...x,
              registeredStudentIds: isReg
                ? x.registeredStudentIds.filter((u) => u !== studentId)
                : [...x.registeredStudentIds, studentId],
            }
          : x,
      ),
    );
    router.refresh();
  }

  const live = state.filter((s) => s.status === "live");
  const scheduled = state.filter((s) => s.status === "scheduled");

  return (
    <div className="space-y-6">
      {live.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-wider text-rose-600 font-semibold mb-2 flex items-center gap-1.5">
            <Radio size={12} className="animate-pulse" />
            Live now ({live.length})
          </p>
          <div className="space-y-3">
            {live.map((s) => (
              <Card
                key={s.id}
                s={s}
                studentId={studentId}
                busy={busyId === s.id}
                onToggle={() => toggleRegister(s)}
              />
            ))}
          </div>
        </section>
      )}

      {scheduled.length > 0 && (
        <section>
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-2 flex items-center gap-1.5">
            <Clock size={12} />
            Upcoming ({scheduled.length})
          </p>
          <div className="space-y-3">
            {scheduled.map((s) => (
              <Card
                key={s.id}
                s={s}
                studentId={studentId}
                busy={busyId === s.id}
                onToggle={() => toggleRegister(s)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Card({
  s,
  studentId,
  busy,
  onToggle,
}: {
  s: SessionWithTitle;
  studentId: string;
  busy: boolean;
  onToggle: () => void;
}) {
  const isReg = s.registeredStudentIds.includes(studentId);
  const isExternal = (s.sessionType ?? "unghost") === "external";
  return (
    <GlassCard
      className={clsx(
        "!p-4",
        s.status === "live" && "border-rose-500/30 bg-rose-500/5",
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {s.status === "live" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">
                ● Live
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 text-[10px] font-semibold uppercase tracking-wider">
                Scheduled
              </span>
            )}
            {isExternal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 border border-violet-500/20 text-[10px] font-semibold uppercase tracking-wider">
                <MonitorPlay size={10} /> External
              </span>
            )}
            <span className="text-[10px] uppercase tracking-wider text-brand-muted">
              {s.bootcampTitle}
            </span>
          </div>
          <p className="font-display font-bold text-brand-ink">{s.title}</p>
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
          </div>
        </div>

        <div className="flex items-center gap-2">
          {s.status === "live" ? (
            isExternal ? (
              <a
                href={`/api/live/${s.id}/join`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-brand text-xs"
              >
                <ExternalLink size={12} /> Enter live session
              </a>
            ) : (
              <Link href={`/live/${s.roomCode}`} className="btn-brand text-xs">
                <ExternalLink size={12} /> Join room
              </Link>
            )
          ) : (
            <GlassButton
              variant={isReg ? "glass" : "brand"}
              size="sm"
              onClick={onToggle}
              disabled={busy}
            >
              {isReg ? (
                <>
                  <Check size={12} /> Registered
                </>
              ) : (
                <>
                  <Bell size={12} /> Register
                </>
              )}
            </GlassButton>
          )}
          {isReg && s.status !== "live" && (
            <button
              onClick={onToggle}
              disabled={busy}
              className="grid place-items-center w-8 h-8 rounded-lg text-brand-muted hover:text-rose-600 hover:bg-rose-500/10 transition"
              title="Unregister"
            >
              <BellOff size={14} />
            </button>
          )}
        </div>
      </div>
    </GlassCard>
  );
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
