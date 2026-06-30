"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Briefcase,
  Check,
  Clock,
  Handshake,
  Lock,
  Megaphone,
  PlayCircle,
  Rocket,
  Star,
  Users,
  Video,
  Workflow,
} from "lucide-react";
import clsx from "clsx";
import { GlassBadge } from "@/components/glass";
import type { Bootcamp, BootcampCategory } from "@/shared/types";
import { ROOMS } from "@/shared/rooms";
import { COURSE_VISUAL } from "@/components/courses/courseVisuals";
import { COURSE_PRICE_PAISE } from "@/shared/lib/courses";
import { formatPaiseAsINR } from "@/shared/lib/pricing";

const ROOM_ICON: Record<BootcampCategory, React.ReactNode> = {
  ai: <Brain size={14} />,
  gtm: <Workflow size={14} />,
  marketing: <Megaphone size={14} />,
  sales: <Handshake size={14} />,
  entrepreneurship: <Rocket size={14} />,
  freelancing: <Briefcase size={14} />,
};

const CATS: {
  id: BootcampCategory | "all";
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "all", label: "All", icon: null },
  ...ROOMS.map((r) => ({ id: r.id, label: r.label, icon: ROOM_ICON[r.id] })),
];

/**
 * Grid of bootcamp "subjects" (cohorts). Each card opens directly into the
 * cohort detail page — a course-owner lands on the player; a non-owner
 * hits the cohort's locked state (defensive, since the room hub already
 * gates on ownership above this grid).
 *
 * Visual identity per card is pulled from `COURSE_VISUAL` for the cohort's
 * room, so cards inside a single room share a colour and the catalog +
 * subject surfaces feel like one design system.
 */
export function BootcampGrid({
  bootcamps,
  instructors,
  enrolledIds,
  sponsoredIds = [],
  ownedCourses = [],
  allCoursesIncluded = false,
  hideFilters = false,
}: {
  bootcamps: Bootcamp[];
  instructors: Record<string, { name?: string } | undefined>;
  enrolledIds: string[];
  /** Bootcamps a recruiter is currently sponsoring for this student. */
  sponsoredIds?: string[];
  /** Course (room) ids the student owns outright — drives the Owned badge
   *  and removes the "Buy course" price tag from the footer. */
  ownedCourses?: BootcampCategory[];
  /** Grandfathered premium includes every course until the plan expires. */
  allCoursesIncluded?: boolean;
  /** Hide the category filter row — used inside a single-room hub where the
   *  room *is* the filter, so the chips would be redundant. */
  hideFilters?: boolean;
}) {
  const ownedSet = new Set(ownedCourses);
  const [cat, setCat] = useState<BootcampCategory | "all">("all");
  const filtered =
    cat === "all" ? bootcamps : bootcamps.filter((b) => b.category === cat);

  return (
    <div className="space-y-6">
      {!hideFilters && (
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                cat === c.id
                  ? "border-transparent bg-brand-gradient text-white shadow-brand-glow"
                  : "border-brand-ink/10 bg-white/50 text-brand-ink hover:bg-white/80",
              )}
            >
              {c.icon}
              {c.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white py-12 text-center text-brand-muted ring-1 ring-black/[0.05]">
          No bootcamps in this category yet.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => (
            <SubjectCard
              key={b.id}
              bootcamp={b}
              instructor={instructors[b.instructorId]}
              enrolled={enrolledIds.includes(b.id)}
              sponsored={sponsoredIds.includes(b.id)}
              owned={allCoursesIncluded || ownedSet.has(b.category)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Subject card ───────────────────────────────────────────────────────────

function SubjectCard({
  bootcamp: b,
  instructor,
  enrolled,
  sponsored,
  owned,
}: {
  bootcamp: Bootcamp;
  instructor: { name?: string } | undefined;
  enrolled: boolean;
  sponsored: boolean;
  owned: boolean;
}) {
  const v = COURSE_VISUAL[b.category];
  const Icon = v.icon;
  const liveCount = b.liveSlots.length;
  const videoCount = b.videos.length;

  return (
    <Link
      href={`/bootcamp/${b.id}`}
      className="group/card flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_22px_55px_-26px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_34px_75px_-28px_rgba(0,0,0,0.6)]"
    >
      {/* Gradient header — same visual identity as the catalog card */}
      <div
        className="relative h-28 overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, ${v.from} 0%, ${v.to} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/25 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-5">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-white/25 backdrop-blur transition-transform duration-500 group-hover/card:-translate-y-0.5 group-hover/card:rotate-[-3deg]">
            <Icon size={22} strokeWidth={2.1} />
          </span>
          <div className="flex flex-col items-end gap-1.5">
            {sponsored ? (
              <GlassBadge tone="warn">★ Sponsored</GlassBadge>
            ) : null}
            {owned ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-emerald-700 shadow-sm ring-1 ring-emerald-200/60">
                <Check size={10} strokeWidth={2.6} /> Full access
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600 shadow-sm">
                <Lock size={10} strokeWidth={2.6} /> Course-gated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ color: v.to }}
        >
          {b.skill}
        </p>
        <h3 className="mt-1.5 line-clamp-2 font-display text-lg font-extrabold leading-snug text-neutral-950 transition-colors group-hover/card:text-brand-primary">
          {b.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-neutral-500">
          {b.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <Clock size={11} /> {b.durationWeeks}w
          </span>
          <span className="inline-flex items-center gap-1">
            <Video size={11} /> {videoCount} lessons
          </span>
          {liveCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <PlayCircle size={11} /> {liveCount} live
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Star size={11} className="text-amber-500" /> {b.rating}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users size={11} /> {b.enrolledStudentIds.length}
          </span>
        </div>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
            <p className="text-[12px] text-neutral-500">
              by{" "}
              <span className="font-semibold text-neutral-900">
                {instructor?.name ?? "—"}
              </span>
            </p>
            {owned ? (
              <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-primary transition-all group-hover/card:gap-2">
                {enrolled ? "Continue watching" : "Start watching"}
                <ArrowRight size={13} />
              </span>
            ) : (
              <span className="text-[12.5px] font-semibold text-brand-primary">
                {formatPaiseAsINR(COURSE_PRICE_PAISE)} · Buy course
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
