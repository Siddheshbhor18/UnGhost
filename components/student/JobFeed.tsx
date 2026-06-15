"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Clock,
  MapPin,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  X,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import type { Job, CompanyProfile } from "@/shared/types";

interface JobWithMatch extends Job {
  matchPct: number;
}

interface Props {
  matched: JobWithMatch[];
  stretch: JobWithMatch[];
  companies: Record<string, CompanyProfile>;
  savedIds?: string[];
}

export function JobFeed({
  matched,
  stretch,
  companies,
  savedIds = [],
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set(savedIds));

  const visibleMatched = matched.filter((j) => !dismissed.has(j.id));
  const visibleStretch = stretch.filter((j) => !dismissed.has(j.id));

  function onDismiss(jobId: string) {
    setDismissed((prev) => new Set(prev).add(jobId));
    fetch(`/api/jobs/${jobId}/not-interested`, { method: "POST" }).catch(() => {});
  }

  function onToggleSave(jobId: string) {
    const isSaved = saved.has(jobId);
    const next = new Set(saved);
    if (isSaved) next.delete(jobId);
    else next.add(jobId);
    setSaved(next);
    fetch(`/api/jobs/${jobId}/save`, {
      method: isSaved ? "DELETE" : "POST",
    }).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-brand-primary">
              Top matches
            </p>
            <h3 className="font-display font-bold text-xl text-brand-ink">
              Jobs that fit your resume
            </h3>
          </div>
          <p className="text-sm text-brand-muted">
            {visibleMatched.length} ranked by match%
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {visibleMatched.length === 0 ? (
            <GlassCard className="md:col-span-2 text-center py-10 text-brand-muted">
              No matches yet — upload your resume above to rank live missions.
            </GlassCard>
          ) : (
            visibleMatched.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                company={companies[j.companyId]}
                saved={saved.has(j.id)}
                onToggleSave={() => onToggleSave(j.id)}
                onDismiss={() => onDismiss(j.id)}
              />
            ))
          )}
        </div>
      </div>

      {!showAll && visibleStretch.length > 0 && (
        <div className="text-center">
          <GlassButton variant="glass" onClick={() => setShowAll(true)}>
            See all jobs ({visibleStretch.length} stretch roles){" "}
            <ArrowRight size={14} />
          </GlassButton>
          <p className="text-xs text-brand-muted mt-2">
            Roles you can still apply to — match might be lower, but the door is
            open.
          </p>
        </div>
      )}

      {showAll && (
        <div>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs font-semibold text-brand-muted">
                Stretch roles
              </p>
              <h3 className="font-display font-bold text-xl text-brand-ink">
                Aim higher, apply anyway
              </h3>
            </div>
            <button
              onClick={() => setShowAll(false)}
              className="text-sm text-brand-primary font-semibold"
            >
              Hide
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {visibleStretch.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                company={companies[j.companyId]}
                dim
                saved={saved.has(j.id)}
                onToggleSave={() => onToggleSave(j.id)}
                onDismiss={() => onDismiss(j.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  job: JobWithMatch;
  company?: CompanyProfile;
  dim?: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onDismiss: () => void;
}

function JobCard({
  job,
  company,
  dim,
  saved,
  onToggleSave,
  onDismiss,
}: CardProps) {
  return (
    <div className="group relative">
      {/* Action buttons — float in top-right corner, don't trigger card link */}
      <div className="absolute top-3 right-3 z-10 flex gap-1">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave();
          }}
          title={saved ? "Unsave" : "Save for later"}
          className={`grid place-items-center w-7 h-7 rounded-lg border transition ${
            saved
              ? "bg-amber-500 text-white border-amber-500 shadow"
              : "bg-white/70 text-brand-muted border-brand-ink/10 hover:text-amber-600 hover:border-amber-500/50"
          }`}
        >
          {saved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          title="Not interested · hide from feed"
          className="grid place-items-center w-7 h-7 rounded-lg bg-white/70 text-brand-muted border border-brand-ink/10 hover:text-rose-600 hover:border-rose-500/50 transition"
        >
          <X size={12} />
        </button>
      </div>

      <Link href={`/missions/${job.id}`} className="block">
        <GlassCard interactive className={dim ? "opacity-90" : ""}>
          <div className="flex items-start justify-between gap-3">
            {company && (
              <CompanyLogo
                name={company.name}
                logoUrl={company.logoUrl}
                size={40}
                rounded="rounded-xl"
              />
            )}
            <div className="flex-1 min-w-0 pr-14">
              <GlassBadge tone="neutral" className="mb-2">
                <Briefcase size={10} /> {company?.name ?? "—"}
              </GlassBadge>
              <h4 className="font-display font-bold text-brand-ink truncate">
                {job.title}
              </h4>
              <p className="text-xs text-brand-muted mt-1 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} /> {job.location} · {job.remote}
                </span>
                <span>
                  ₹{job.salaryMin}–{job.salaryMax} LPA
                </span>
                {job.experienceMax > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Briefcase size={11} /> {job.experienceMin}–{job.experienceMax} yrs exp
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {job.skills.slice(0, 4).map((s) => (
                  <span
                    key={s}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-brand-ink/5 text-brand-muted font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0 pt-7">
              <div
                className={
                  "font-display font-extrabold text-2xl " +
                  (job.matchPct >= 80
                    ? "text-emerald-600"
                    : job.matchPct >= 60
                    ? "text-brand-primary"
                    : "text-brand-muted")
                }
              >
                {job.matchPct}
                <span className="text-sm">%</span>
              </div>
              <GlassBadge
                tone={
                  job.slaHours <= 24
                    ? "success"
                    : job.slaHours <= 48
                    ? "warn"
                    : "brand"
                }
                className="mt-2"
              >
                <Clock size={10} /> {job.slaHours}h
              </GlassBadge>
            </div>
          </div>
        </GlassCard>
      </Link>
    </div>
  );
}
