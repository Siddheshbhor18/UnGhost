"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Ghost,
  Sparkles,
} from "lucide-react";
import { GlassBadge, GlassCard } from "@/components/glass";
import type { Application, CompanyProfile, Job } from "@/shared/types";

type Filter = "all" | "action" | "awaiting" | "recent";
type Sort = "recent" | "sla" | "match";

interface Props {
  apps: Application[];
  jobs: Record<string, Job>;
  companies: Record<string, CompanyProfile>;
}

const STAGE_LABEL: Record<string, string> = {
  new_matches: "Awaiting review",
  under_review: "Under review",
  interview: "Interview",
  offer: "Offer extended",
  hired: "Hired",
  rejected: "Rejected",
};

export function ApplicationsList({ apps, jobs, companies }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const now = Date.now();

  const enriched = useMemo(
    () =>
      apps.map((a) => {
        const slaDiff = new Date(a.slaDeadline).getTime() - now;
        const isTerminal = a.stage === "hired" || a.stage === "rejected";
        const expired = slaDiff <= 0 && !isTerminal;
        const pulse = !expired && !isTerminal && slaDiff < 4 * 3600_000;
        return { ...a, slaDiff, expired, pulse, isTerminal };
      }),
    [apps, now],
  );

  const filtered = enriched.filter((a) => {
    if (filter === "action") return a.expired || a.stage === "offer";
    if (filter === "awaiting") return !a.isTerminal && !a.expired;
    if (filter === "recent")
      return Date.now() - new Date(a.createdAt).getTime() < 7 * 86400_000;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "sla") {
      if (a.isTerminal && !b.isTerminal) return 1;
      if (!a.isTerminal && b.isTerminal) return -1;
      return a.slaDiff - b.slaDiff;
    }
    if (sort === "match") return b.matchPct - a.matchPct;
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });

  const counts = {
    all: enriched.length,
    action: enriched.filter((a) => a.expired || a.stage === "offer").length,
    awaiting: enriched.filter((a) => !a.isTerminal && !a.expired).length,
    recent: enriched.filter(
      (a) => Date.now() - new Date(a.createdAt).getTime() < 7 * 86400_000,
    ).length,
  };

  return (
    <div className="space-y-5">
      {/* Filter tabs + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 p-1 rounded-2xl bg-brand-ink/5 text-xs font-semibold">
          <TabBtn
            label={`All · ${counts.all}`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          <TabBtn
            label={`Action needed · ${counts.action}`}
            tone="danger"
            active={filter === "action"}
            onClick={() => setFilter("action")}
          />
          <TabBtn
            label={`Awaiting · ${counts.awaiting}`}
            active={filter === "awaiting"}
            onClick={() => setFilter("awaiting")}
          />
          <TabBtn
            label={`Recent · ${counts.recent}`}
            active={filter === "recent"}
            onClick={() => setFilter("recent")}
          />
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-brand-muted">
          <Filter size={12} />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="glass-input !py-1.5 !px-3 text-xs"
          >
            <option value="recent">Most recent</option>
            <option value="sla">SLA urgency</option>
            <option value="match">Most promising</option>
          </select>
        </div>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <GlassCard className="text-center !py-12">
          <Briefcase
            size={28}
            className="mx-auto text-brand-muted mb-3"
          />
          <p className="font-display font-bold text-brand-ink">
            Nothing here yet
          </p>
          <p className="text-sm text-brand-muted mt-2">
            Apply to a mission from your dashboard to start your pipeline.
          </p>
          <Link
            href="/dashboard"
            className="btn-brand mt-5 inline-flex"
          >
            Browse missions →
          </Link>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => {
            const j = jobs[a.jobId];
            const co = j ? companies[j.companyId] : undefined;
            const slaLabel = slaTextFor(a);
            return (
              <Link
                key={a.id}
                href={`/student/applications/${a.id}`}
                className={`block rounded-2xl bg-white/55 backdrop-blur-xl border shadow-glass p-5 hover:-translate-y-0.5 hover:shadow-glass-hover transition ${
                  a.expired
                    ? "border-rose-500/30 bg-rose-500/5"
                    : a.pulse
                    ? "border-amber-500/30 animate-pulse"
                    : "border-white/60"
                }`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <GlassBadge tone="neutral">{co?.name}</GlassBadge>
                      <GlassBadge
                        tone={
                          a.stage === "hired"
                            ? "success"
                            : a.stage === "rejected"
                            ? "danger"
                            : a.expired
                            ? "danger"
                            : "brand"
                        }
                      >
                        {a.withdrawnAt ? "Withdrawn" : STAGE_LABEL[a.stage]}
                      </GlassBadge>
                      {a.expired && (
                        <GlassBadge tone="danger">
                          <Ghost size={10} /> SLA breached · refunded
                        </GlassBadge>
                      )}
                    </div>
                    <p className="font-display font-bold text-lg text-brand-ink line-clamp-1">
                      {j?.title ?? "—"}
                    </p>
                    <p className="text-xs text-brand-muted mt-1">
                      Applied{" "}
                      {new Date(a.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · Match{" "}
                      <span className="text-brand-ink font-semibold">
                        {a.matchPct}%
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    {!a.isTerminal && (
                      <>
                        <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                          SLA
                        </p>
                        <p
                          className={`font-display font-bold text-lg font-mono ${
                            a.expired
                              ? "text-rose-600"
                              : a.pulse
                              ? "text-amber-600"
                              : "text-brand-ink"
                          }`}
                        >
                          <Clock size={14} className="inline mr-1" />
                          {slaLabel}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-ink/5">
                  <p className="text-xs text-brand-muted">
                    {a.assessment?.grade
                      ? `Graded ${a.assessment.grade.score}/100`
                      : "Awaiting AI grading"}
                    {a.updateRequestedAt && " · update ping sent"}
                  </p>
                  <span className="text-xs font-semibold text-brand-primary inline-flex items-center gap-0.5">
                    View details <ChevronRight size={12} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function slaTextFor(a: {
  slaDiff: number;
  expired: boolean;
  isTerminal: boolean;
}): string {
  if (a.isTerminal) return "—";
  const abs = Math.abs(a.slaDiff);
  const h = Math.floor(abs / 3600_000);
  const m = Math.floor((abs % 3600_000) / 60_000);
  if (a.expired) return `−${h}h ${m}m`;
  if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
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
  tone?: "danger";
}) {
  const activeCls = tone === "danger"
    ? "bg-rose-500 text-white shadow-glass"
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
