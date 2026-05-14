"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Application, Job, Stage } from "@/lib/data/types";
import { slaCountdown } from "@/lib/utils/sla";
import { Badge } from "@/components/arcade/Badge";

const stageLabel: Record<Stage, string> = {
  new_matches: "QUEUED",
  under_review: "IN REVIEW",
  interview: "INTERVIEW",
  offer: "OFFER",
  hired: "HIRED",
  rejected: "REJECTED",
};

const stageTone: Record<Stage, "blue" | "yellow" | "pink" | "green" | "red"> = {
  new_matches: "blue",
  under_review: "yellow",
  interview: "pink",
  offer: "green",
  hired: "green",
  rejected: "red",
};

export function MissionTimeline({
  applications,
  jobs,
}: {
  applications: Application[];
  jobs: Record<string, Job>;
}) {
  // Tick once a minute to keep countdowns fresh.
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (applications.length === 0) {
    return (
      <div className="pixel-card p-6 text-center">
        <p className="font-mono text-xs text-ink-muted">
          No active missions yet. Browse the feed and apply to your first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {applications.map((a) => {
        const job = jobs[a.jobId];
        const sla = slaCountdown(a.slaDeadline);
        return (
          <Link href={`/missions/${a.jobId}`} key={a.id}>
            <div className={`pixel-card p-3 hover:border-neon-pink transition-colors ${sla.pulse && !sla.expired ? "animate-pulse" : ""}`}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-pixel text-xs text-neon-pink truncate">{job?.title ?? "—"}</p>
                <Badge tone={stageTone[a.stage]}>{stageLabel[a.stage]}</Badge>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-ink-muted">Match {a.matchPct}%</span>
                <span className={sla.expired ? "text-neon-red" : sla.pulse ? "text-neon-yellow" : "text-ink-muted"}>
                  SLA {sla.label}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
