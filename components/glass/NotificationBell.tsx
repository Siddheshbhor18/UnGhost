"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Sparkles,
  X,
} from "lucide-react";
import clsx from "clsx";
import type { AppNotification, NotificationKind } from "@/shared/types";

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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Initial poll + 60s background refresh
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/notifications?limit=8", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: { items: AppNotification[]; unread: number } =
          await res.json();
        if (!cancelled) {
          setItems(data.items);
          setUnread(data.unread);
        }
      } catch {
        /* ignore */
      }
    }
    poll();
    const t = setInterval(poll, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    );
    setUnread((u) => Math.max(0, u - 1));
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  async function markAll() {
    setLoading(true);
    setItems((prev) =>
      prev.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() },
      ),
    );
    setUnread(0);
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setLoading(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid place-items-center w-9 h-9 rounded-xl bg-white/40 border border-brand-ink/5 text-brand-ink hover:bg-white/70 hover:text-brand-primary transition"
        aria-label="Notifications"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 z-50">
          <div className="rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/60 shadow-glass-lg overflow-hidden">
            <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-brand-ink/5">
              <div>
                <p className="font-display font-bold text-brand-ink">
                  Notifications
                </p>
                <p className="text-[10px] text-brand-muted">
                  {unread} unread · {items.length} recent
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {unread > 0 && (
                  <button
                    onClick={markAll}
                    disabled={loading}
                    className="text-[11px] font-semibold text-brand-primary hover:underline inline-flex items-center gap-1"
                  >
                    <CheckCheck size={11} /> Mark all
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-brand-muted hover:text-brand-ink"
                >
                  <X size={14} />
                </button>
              </div>
            </header>

            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Sparkles
                    size={20}
                    className="mx-auto text-brand-muted mb-2"
                  />
                  <p className="text-sm text-brand-ink font-semibold">
                    All caught up.
                  </p>
                  <p className="text-xs text-brand-muted mt-1">
                    New activity lands here in real-time.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-brand-ink/5">
                  {items.map((n) => (
                    <li key={n.id}>
                      <Link
                        href={n.link ?? "#"}
                        onClick={() => {
                          if (!n.readAt) markRead(n.id);
                          setOpen(false);
                        }}
                        className={clsx(
                          "flex items-start gap-3 px-4 py-3 transition",
                          n.readAt
                            ? "hover:bg-white/40"
                            : "bg-brand-primary/5 hover:bg-brand-primary/10",
                        )}
                      >
                        <span className="text-lg shrink-0 leading-none mt-0.5">
                          {KIND_ICON[n.kind] ?? "🛎️"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <p
                              className={clsx(
                                "text-sm line-clamp-1",
                                n.readAt
                                  ? "text-brand-ink/85"
                                  : "text-brand-ink font-semibold",
                              )}
                            >
                              {n.title}
                            </p>
                            {!n.readAt && (
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-brand-muted line-clamp-2 leading-snug">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-brand-muted/70 mt-1">
                            {relativeTime(n.createdAt)}
                            {n.actorLabel && ` · ${n.actorLabel}`}
                            {n.priority === "critical" && (
                              <span className="ml-1.5 text-rose-600 font-semibold">
                                · CRITICAL
                              </span>
                            )}
                            {n.priority === "high" && !n.readAt && (
                              <span className="ml-1.5 text-amber-600 font-semibold">
                                · high
                              </span>
                            )}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="px-4 py-2.5 border-t border-brand-ink/5">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block text-center text-xs font-semibold text-brand-primary hover:underline"
              >
                See all notifications →
              </Link>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
