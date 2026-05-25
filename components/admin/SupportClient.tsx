"use client";

import { useState } from "react";
import clsx from "clsx";
import type {
  SupportTicket,
  SupportTicketStatus,
} from "@/shared/types";
import { GlassCard } from "@/components/glass";
import { Mail, Clock, User as UserIcon } from "lucide-react";

const PRI_TONE: Record<SupportTicket["priority"], string> = {
  urgent: "bg-rose-500 text-white",
  high: "bg-amber-500 text-white",
  normal: "bg-brand-primary/15 text-brand-primary",
  low: "bg-brand-ink/5 text-brand-muted",
};

const STATUS_TONE: Record<SupportTicketStatus, string> = {
  open: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  in_progress: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
  resolved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  closed: "bg-brand-ink/5 text-brand-muted border-brand-ink/10",
};

const CATEGORY_LABEL: Record<SupportTicket["category"], string> = {
  billing: "Billing",
  payment: "Payment",
  account: "Account",
  abuse: "Abuse",
  application: "Application",
  bootcamp: "Bootcamp",
  recruiter_dispute: "Recruiter dispute",
  bug: "Bug",
  bug_report: "Bug report",
  feature_request: "Feature",
  press: "Press",
  other: "Other",
};

export function SupportClient({ initial }: { initial: SupportTicket[] }) {
  const [tickets, setTickets] = useState<SupportTicket[]>(initial);
  const [selected, setSelected] = useState<SupportTicket | null>(initial[0] ?? null);
  const [filter, setFilter] = useState<"all" | SupportTicketStatus>("all");
  const [busyTicketId, setBusyTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Flip a ticket's status. Optimistic: local state updates immediately,
   * server PATCH confirms in background. On failure we roll back and
   * surface the error inline so the admin doesn't trust a phantom flip.
   * The PATCH route is audited so the change shows up in /admin/audit.
   */
  async function setStatus(
    id: string,
    status: SupportTicketStatus,
  ): Promise<void> {
    const prev = tickets.find((t) => t.id === id);
    if (!prev) return;
    setError(null);
    setBusyTicketId(id);
    setTickets((list) =>
      list.map((t) =>
        t.id === id
          ? { ...t, status, updatedAt: new Date().toISOString() }
          : t,
      ),
    );
    if (selected?.id === id) setSelected({ ...selected, status });
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Update failed (${res.status})`);
      }
    } catch (e) {
      // Rollback optimistic update on failure.
      setTickets((list) =>
        list.map((t) =>
          t.id === id
            ? { ...t, status: prev.status, updatedAt: prev.updatedAt }
            : t,
        ),
      );
      if (selected?.id === id) setSelected({ ...selected, status: prev.status });
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyTicketId(null);
    }
  }

  const filtered = tickets.filter((t) => filter === "all" || t.status === filter);

  return (
    <div className="grid lg:grid-cols-[420px_1fr] gap-4">
      <div className="space-y-3">
        <div className="flex gap-1 p-1 rounded-xl bg-brand-ink/5">
          {(["all", "open", "in_progress", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition capitalize flex-1",
                filter === f
                  ? "bg-white text-brand-ink shadow-sm"
                  : "text-brand-muted hover:text-brand-ink",
              )}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={clsx(
                "w-full text-left rounded-2xl p-3 border transition",
                selected?.id === t.id
                  ? "bg-brand-primary/10 border-brand-primary/30"
                  : "bg-white/50 border-white/60 hover:bg-white/70",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-display text-sm font-semibold text-brand-ink line-clamp-1">
                  {t.subject}
                </p>
                <span
                  className={clsx(
                    "px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider shrink-0",
                    PRI_TONE[t.priority],
                  )}
                >
                  {t.priority}
                </span>
              </div>
              <p className="text-[11px] text-brand-muted line-clamp-2 mb-1.5">
                {t.bodyPreview}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-brand-muted">
                <span className="inline-flex items-center gap-1">
                  <UserIcon size={9} /> {t.requesterRole}
                </span>
                <span>·</span>
                <span>{CATEGORY_LABEL[t.category]}</span>
                <span className="ml-auto">{timeAgo(t.createdAt)}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-brand-muted text-center py-8">No tickets.</p>
          )}
        </div>
      </div>

      <GlassCard className="!p-6 min-h-[480px]">
        {!selected ? (
          <p className="text-sm text-brand-muted text-center py-10">Select a ticket.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={clsx(
                  "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider",
                  STATUS_TONE[selected.status],
                )}
              >
                {selected.status.replace("_", " ")}
              </span>
              <span
                className={clsx(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                  PRI_TONE[selected.priority],
                )}
              >
                {selected.priority}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-brand-muted">
                {CATEGORY_LABEL[selected.category]}
              </span>
            </div>
            <h2 className="font-display font-extrabold text-2xl text-brand-ink">
              {selected.subject}
            </h2>
            <div className="flex items-center gap-3 text-xs text-brand-muted mt-2">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={11} />
                {selected.requesterEmail}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {timeAgo(selected.createdAt)}
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-white/60 border border-white/70 p-4">
              <p className="text-sm text-brand-ink/85 leading-relaxed whitespace-pre-wrap">
                {selected.bodyPreview}
              </p>
            </div>

            {error ? (
              <div className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {error}
              </div>
            ) : null}

            <div className="flex items-center gap-2 mt-6 flex-wrap">
              {selected.status === "open" && (
                <button
                  onClick={() => setStatus(selected.id, "in_progress")}
                  disabled={busyTicketId === selected.id}
                  className="btn-brand text-xs disabled:opacity-50"
                >
                  {busyTicketId === selected.id ? "Saving…" : "Take ticket"}
                </button>
              )}
              {selected.status === "in_progress" && (
                <button
                  onClick={() => setStatus(selected.id, "resolved")}
                  disabled={busyTicketId === selected.id}
                  className="btn-brand text-xs disabled:opacity-50"
                >
                  {busyTicketId === selected.id ? "Saving…" : "Mark resolved"}
                </button>
              )}
              {selected.status === "resolved" && (
                <button
                  onClick={() => setStatus(selected.id, "closed")}
                  disabled={busyTicketId === selected.id}
                  className="btn-glass text-xs disabled:opacity-50"
                >
                  {busyTicketId === selected.id ? "Saving…" : "Close ticket"}
                </button>
              )}
              {(selected.status === "resolved" || selected.status === "closed") && (
                <button
                  onClick={() => setStatus(selected.id, "open")}
                  disabled={busyTicketId === selected.id}
                  className="btn-glass text-xs disabled:opacity-50"
                >
                  {busyTicketId === selected.id ? "Saving…" : "Reopen"}
                </button>
              )}
              <a
                href={`mailto:${selected.requesterEmail}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                className="btn-glass text-xs"
              >
                <Mail size={12} /> Reply by email
              </a>
            </div>

            <p className="text-[10px] text-brand-muted mt-6">
              Status changes persist immediately to the{" "}
              <code className="text-brand-primary">supportTickets</code>{" "}
              collection and are audit-logged. Email replies go via your
              mail client (mailto link above).
            </p>
          </>
        )}
      </GlassCard>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}
