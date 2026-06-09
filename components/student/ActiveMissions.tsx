"use client";

import Link from "next/link";
import { Briefcase, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Application, CompanyProfile, Job } from "@/shared/types";
import { slaCountdown } from "@/shared/lib/sla";

interface Props {
  apps: Application[];
  jobs: Record<string, Job>;
  companies: Record<string, CompanyProfile>;
}

const STATUS_LABEL: Record<string, string> = {
  new_matches: "Awaiting review",
  under_review: "Under review",
  interview: "Interview",
  offer: "Offer extended",
  hired: "Hired",
  rejected: "Rejected",
};

export function ActiveMissions({ apps, jobs, companies }: Props) {
  const live = apps
    // Submitted, non-terminal applications only — failed/unsubmitted attempts
    // aren't active missions (no SLA, not with a recruiter).
    .filter(
      (a) => a.submitted !== false && !["hired", "rejected"].includes(a.stage),
    )
    .slice(0, 5);

  if (live.length === 0) {
    return (
      <div className="rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 p-5 text-center">
        <Briefcase size={20} className="mx-auto text-brand-muted mb-2" />
        <p className="text-sm font-semibold text-brand-ink">No active missions</p>
        <p className="text-xs text-brand-muted mt-1">
          Apply to a role to start your pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-brand-ink">
          Active Missions
        </p>
        <Link
          href="/student/applications"
          className="text-xs font-semibold text-brand-primary hover:underline"
        >
          {apps.length > 5 ? "See all →" : "Manage →"}
        </Link>
      </div>
      {live.map((a) => {
        const j = jobs[a.jobId];
        const co = j ? companies[j.companyId] : undefined;
        const sla = slaCountdown(a.slaDeadline);
        const tone = sla.expired
          ? "border-rose-300 bg-rose-50/60"
          : sla.pulse
          ? "border-amber-300 bg-amber-50/60 animate-pulse"
          : "border-white/60 bg-white/50";
        const Icon = sla.expired
          ? AlertTriangle
          : a.stage === "hired"
          ? CheckCircle2
          : Briefcase;
        const iconColor = sla.expired
          ? "text-rose-600"
          : sla.pulse
          ? "text-amber-600"
          : "text-brand-primary";
        return (
          <Link
            key={a.id}
            href={`/student/applications/${a.id}`}
            className={`block rounded-2xl border backdrop-blur-xl p-4 shadow-glass hover:shadow-glass-hover hover:-translate-y-0.5 transition ${tone}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Icon size={11} className={iconColor} />
                  <span className={iconColor}>
                    {STATUS_LABEL[a.stage] ?? a.stage}
                  </span>
                </p>
                <p className="font-display text-sm font-semibold text-brand-ink line-clamp-1 mt-1">
                  {j?.title ?? "—"}
                </p>
                <p className="text-xs text-brand-muted line-clamp-1">{co?.name}</p>
              </div>
              <span className="text-xs font-bold text-brand-primary">
                {a.matchPct}%
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] pt-2 border-t border-brand-ink/5">
              <span className="text-brand-muted">SLA</span>
              <span
                className={`font-mono font-semibold ${
                  sla.expired
                    ? "text-rose-600"
                    : sla.pulse
                    ? "text-amber-600"
                    : "text-brand-ink"
                }`}
              >
                {sla.label}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
