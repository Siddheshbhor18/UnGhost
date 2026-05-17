"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, ChevronRight } from "lucide-react";
import Link from "next/link";

interface BriefingProps {
  studentName: string;
  newMatches: number;
  pendingAssessments: number;
  upcomingBootcamp?: { title: string; date: string } | null;
  /** Soft nudge below 80% per PRD. */
  profileCompleteness?: number;
}

/**
 * AI-style Daily Briefing banner. Dismissible per day. Time-of-day aware.
 * Currently template-driven; will route through Claude in Phase 2.
 */
export function DailyBriefing(props: BriefingProps) {
  const [show, setShow] = useState(true);
  const dateKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (localStorage.getItem(`unghost:briefing_dismissed_${dateKey}`)) {
      setShow(false);
    }
  }, [dateKey]);

  function dismiss() {
    localStorage.setItem(`unghost:briefing_dismissed_${dateKey}`, "1");
    setShow(false);
  }

  if (!show) return null;

  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? "Up late"
      : hour < 12
      ? "Good morning"
      : hour < 17
      ? "Afternoon"
      : "Evening";

  const fragments: string[] = [];
  if (
    props.profileCompleteness !== undefined &&
    props.profileCompleteness < 80
  ) {
    if (props.profileCompleteness < 60) {
      fragments.push(
        `your profile is ${props.profileCompleteness}% complete — applications are gated below 60%`,
      );
    } else {
      fragments.push(
        `your profile is ${props.profileCompleteness}% — push past 80% for stronger match scoring`,
      );
    }
  }
  if (props.newMatches > 0)
    fragments.push(
      `${props.newMatches} new strong match${props.newMatches === 1 ? "" : "es"} overnight`,
    );
  if (props.pendingAssessments > 0)
    fragments.push(
      `${props.pendingAssessments} assessment${props.pendingAssessments === 1 ? "" : "s"} pending`,
    );
  if (props.upcomingBootcamp)
    fragments.push(`${props.upcomingBootcamp.title} starts ${props.upcomingBootcamp.date}`);

  const briefing =
    fragments.length === 0
      ? "All caught up. New missions land throughout the day — keep your skills profile tight."
      : fragments.join(" · ");

  return (
    <div className="rounded-2xl bg-gradient-to-r from-brand-primary/10 via-white/60 to-white/40 backdrop-blur-xl border border-white/60 shadow-glass p-5 mb-6 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-brand-muted hover:text-brand-ink transition"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="grid place-items-center w-9 h-9 rounded-xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
          <Sparkles size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-1">
            Daily Briefing
          </p>
          <p className="text-sm text-brand-ink leading-relaxed">
            <span className="font-semibold">
              {greeting}, {props.studentName}.
            </span>{" "}
            {briefing}.
          </p>
          {props.pendingAssessments > 0 && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-brand-primary hover:gap-2 transition-all"
            >
              Finish pending assessments <ChevronRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
