"use client";

import { useState } from "react";
import Link from "next/link";
import { Brain, Megaphone, Handshake, Rocket, Briefcase, Star, Clock, Users, Video } from "lucide-react";
import clsx from "clsx";
import { GlassBadge, GlassCard } from "@/components/glass";
import type { Bootcamp, BootcampCategory } from "@/shared/types";
import { ROOMS } from "@/shared/rooms";

const ROOM_ICON: Record<BootcampCategory, React.ReactNode> = {
  ai: <Brain size={14} />,
  marketing: <Megaphone size={14} />,
  sales: <Handshake size={14} />,
  entrepreneurship: <Rocket size={14} />,
  freelancing: <Briefcase size={14} />,
};

const CATS: { id: BootcampCategory | "all"; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All", icon: null },
  ...ROOMS.map((r) => ({ id: r.id, label: r.label, icon: ROOM_ICON[r.id] })),
];

export function BootcampGrid({
  bootcamps,
  instructors,
  enrolledIds,
  sponsoredIds = [],
}: {
  bootcamps: Bootcamp[];
  instructors: Record<string, { name?: string } | undefined>;
  enrolledIds: string[];
  /** Bootcamps a recruiter is currently sponsoring for this student. */
  sponsoredIds?: string[];
}) {
  const [cat, setCat] = useState<BootcampCategory | "all">("all");
  const filtered = cat === "all" ? bootcamps : bootcamps.filter((b) => b.category === cat);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={clsx(
              "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold border transition",
              cat === c.id
                ? "bg-brand-gradient text-white border-transparent shadow-brand-glow"
                : "bg-white/50 text-brand-ink border-brand-ink/10 hover:bg-white/80",
            )}
          >
            {c.icon}
            {c.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <GlassCard className="text-center py-10 text-brand-muted">
          No bootcamps in this category yet.
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => {
            const enrolled = enrolledIds.includes(b.id);
            const liveCount = b.liveSlots.length;
            const videoCount = b.videos.length;
            const ins = instructors[b.instructorId];
            return (
              <Link key={b.id} href={`/bootcamp/${b.id}`}>
                <GlassCard interactive className="h-full">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <GlassBadge tone="brand">{b.skill}</GlassBadge>
                    <div className="flex flex-col items-end gap-1">
                      {sponsoredIds.includes(b.id) && (
                        <GlassBadge tone="warn">
                          ★ Sponsored — free
                        </GlassBadge>
                      )}
                      {enrolled && <GlassBadge tone="success">Enrolled</GlassBadge>}
                    </div>
                  </div>
                  <h4 className="font-display font-bold text-base text-brand-ink mb-1.5 leading-snug">
                    {b.title}
                  </h4>
                  <p className="text-sm text-brand-muted line-clamp-2 mb-4">{b.description}</p>

                  <div className="flex flex-wrap gap-3 text-xs text-brand-muted mb-3">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} /> {b.durationWeeks}w
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Video size={11} /> {videoCount} videos · {liveCount} live
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star size={11} className="text-amber-500" /> {b.rating}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={11} /> {b.enrolledStudentIds.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-brand-ink/10">
                    <p className="text-xs text-brand-muted">
                      by <span className="text-brand-ink font-semibold">{ins?.name ?? "—"}</span>
                    </p>
                    {/* Bootcamps are bundled in the Premium plan — no per-course price */}
                    <p className="text-xs font-semibold text-violet-700 inline-flex items-center gap-1">
                      ✦ Premium
                    </p>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
