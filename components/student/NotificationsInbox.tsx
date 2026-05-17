"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCheck,
  ChevronRight,
  Inbox,
  Sparkles,
} from "lucide-react";
import { GlassBadge, GlassCard } from "@/components/glass";
import type { AppNotification, NotificationKind } from "@/shared/types";

type Filter = "all" | "unread" | "action";

const KIND_ICON: Record<NotificationKind, string> = {
  application_graded: "📝",
  application_advanced: "✨",
  application_rejected: "📄",
  application_hired: "🎉",
  sla_warning: "⏱️",
  sla_breached: "👻",
  sponsorship_offered: "🎁",
  sponsorship_accepted: "✅",
  sponsorship_declined: "↩️",
  inmail_received: "📨",
  inmail_accepted: "✅",
  inmail_declined: "↩️",
  message_received: "💬",
  bootcamp_complete: "🎓",
  skill_verified: "✓",
  system: "🛎️",
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

interface Props {
  initial: AppNotification[];
}

export function NotificationsInbox({ initial }: Props) {
  const [items, setItems] = useState<AppNotification[]>(initial);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (filter === "unread") return !n.readAt;
      if (filter === "action") return n.actionRequired && !n.readAt;
      return true;
    });
  }, [items, filter]);

  const counts = useMemo(
    () => ({
      all: items.length,
      unread: items.filter((n) => !n.readAt).length,
      action: items.filter((n) => n.actionRequired && !n.readAt).length,
    }),
    [items],
  );

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  async function markAll() {
    setItems((prev) =>
      prev.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() },
      ),
    );
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-1 p-1 rounded-2xl bg-brand-ink/5 text-xs font-semibold">
          <TabBtn
            label={`All · ${counts.all}`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <TabBtn
            label={`Unread · ${counts.unread}`}
            active={filter === "unread"}
            onClick={() => setFilter("unread")}
          />
          <TabBtn
            label={`Action required · ${counts.action}`}
            active={filter === "action"}
            tone={counts.action > 0 ? "warn" : undefined}
            onClick={() => setFilter("action")}
          />
        </div>
        {counts.unread > 0 && (
          <button
            onClick={markAll}
            className="text-xs font-semibold text-brand-primary hover:underline inline-flex items-center gap-1"
          >
            <CheckCheck size={12} /> Mark all read
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <GlassCard className="text-center !py-12">
          <Inbox size={28} className="mx-auto text-brand-muted mb-3" />
          <p className="font-display font-bold text-brand-ink">
            {filter === "unread"
              ? "All caught up · zero unread"
              : filter === "action"
              ? "Nothing needs your action"
              : "Nothing here yet"}
          </p>
          <p className="text-sm text-brand-muted mt-2">
            Activity from your applications, bootcamps, and recruiters will land
            here in real-time.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Link
              key={n.id}
              href={n.link ?? "#"}
              onClick={() => !n.readAt && markRead(n.id)}
              className={`block rounded-2xl backdrop-blur-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-glass-hover ${
                n.readAt
                  ? "bg-white/45 border-white/60"
                  : "bg-brand-primary/5 border-brand-primary/20"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none mt-1">
                  {KIND_ICON[n.kind] ?? "🛎️"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p
                      className={`font-display ${
                        n.readAt
                          ? "font-medium text-brand-ink/85"
                          : "font-bold text-brand-ink"
                      }`}
                    >
                      {n.title}
                    </p>
                    {!n.readAt && (
                      <span className="w-2 h-2 rounded-full bg-brand-primary" />
                    )}
                    {n.priority === "critical" && (
                      <GlassBadge tone="danger">CRITICAL</GlassBadge>
                    )}
                    {n.priority === "high" && !n.readAt && (
                      <GlassBadge tone="warn">High</GlassBadge>
                    )}
                    {n.actionRequired && !n.readAt && (
                      <GlassBadge tone="brand">
                        <Sparkles size={9} /> Action
                      </GlassBadge>
                    )}
                  </div>
                  <p className="text-sm text-brand-ink/80 leading-relaxed">
                    {n.body}
                  </p>
                  <p className="text-[10px] text-brand-muted/80 mt-2 font-mono">
                    {relativeTime(n.createdAt)}
                    {n.actorLabel && ` · ${n.actorLabel}`}
                  </p>
                </div>
                <ChevronRight
                  size={14}
                  className="text-brand-muted/60 mt-1 shrink-0"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: "warn";
}) {
  const activeCls =
    tone === "warn"
      ? "bg-amber-500 text-white shadow"
      : "bg-white shadow-sm text-brand-ink";
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl transition ${
        active ? activeCls : "text-brand-muted hover:text-brand-ink"
      }`}
    >
      {label}
    </button>
  );
}
