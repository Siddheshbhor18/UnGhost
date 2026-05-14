"use client";

import Link from "next/link";
import type { CompanyProfile, Job } from "@/lib/data/types";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { Badge } from "@/components/arcade/Badge";
import { ScoreCounter } from "@/components/arcade/ScoreCounter";
import { Clock, MapPin, Banknote } from "lucide-react";

export function MatchmakerFeed({
  jobs,
  companies,
  matchByJob,
}: {
  jobs: Job[];
  companies: Record<string, CompanyProfile>;
  matchByJob: Record<string, number>;
}) {
  return (
    <div className="space-y-4">
      {jobs.map((j) => {
        const co = companies[j.companyId];
        const m = matchByJob[j.id] ?? 50;
        return (
          <Link key={j.id} href={`/missions/${j.id}`}>
            <ArcadeCard glow="green" interactive className="hover:border-neon-green">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge tone="blue">{co?.name ?? "—"}</Badge>
                    <Badge tone={j.slaHours <= 24 ? "green" : j.slaHours <= 48 ? "yellow" : "blue"}>
                      <Clock size={10} /> {j.slaHours}H
                    </Badge>
                  </div>
                  <h3 className="font-pixel text-base text-neon-pink mb-2">{j.title}</h3>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {j.skills.slice(0, 5).map((s) => (
                      <Badge tone="muted" key={s}>{s}</Badge>
                    ))}
                  </div>
                  <p className="font-mono text-[11px] text-ink-muted flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-1"><MapPin size={11} /> {j.location} · {j.remote}</span>
                    <span className="inline-flex items-center gap-1"><Banknote size={11} /> ₹{j.salaryMin}–{j.salaryMax}L</span>
                  </p>
                </div>
                <div className="text-right shrink-0 border-l-2 border-bg-ink pl-4">
                  <p className="font-pixel text-[9px] text-ink-muted mb-1">MATCH</p>
                  <ScoreCounter
                    value={m}
                    suffix="%"
                    color={m >= 85 ? "green" : m >= 65 ? "yellow" : "pink"}
                    className="text-2xl"
                  />
                </div>
              </div>
            </ArcadeCard>
          </Link>
        );
      })}
    </div>
  );
}
