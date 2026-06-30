"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Layers,
  Lock,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { AddToCartButton } from "@/components/courses/AddToCartButton";
import { COURSE_VISUAL } from "@/components/courses/courseVisuals";
import type { BootcampCategory } from "@/shared/rooms";
import { roomLabel } from "@/shared/rooms";
import { COURSE_CONTENT } from "@/shared/course-content";
import {
  COURSE_PRICE_PAISE,
  EVERYTHING_BUNDLE_PAISE,
  FREE_WITH,
} from "@/shared/lib/courses";
import { formatPaiseAsINR } from "@/shared/lib/pricing";

interface Props {
  id: BootcampCategory;
  /** How many live cohorts are in this room — surfaced as a trust signal so
   *  buyers know what they unlock the moment they own the course. */
  cohortCount: number;
  /** How many instructors are teaching cohorts in this room — same purpose
   *  as `cohortCount`. Defaults to 0 when not provided. */
  instructorCount?: number;
}

/**
 * Hard purchase wall shown on `/bootcamps/[room]` when the visitor does
 * not own the course. Replaces the cohort list outright — non-owners
 * cannot enter the room or browse subjects until they buy.
 *
 * Design intent: premium feel, immediate price + value clarity, single
 * primary CTA (add to cart). Cohort + instructor counts come straight from
 * the room hub's existing data, so this card is informational and the
 * visitor knows exactly what they unlock.
 */
export function RoomLockedWall({
  id,
  cohortCount,
  instructorCount = 0,
}: Props) {
  const visual = COURSE_VISUAL[id];
  const Icon = visual.icon;
  const { tagline, curriculum } = COURSE_CONTENT[id];
  const unlocks = FREE_WITH[id];
  const label = roomLabel(id);

  return (
    <article className="relative overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_30px_80px_-30px_rgba(0,0,0,0.55)] ring-1 ring-black/[0.05]">
      <div className="grid gap-0 md:grid-cols-[1fr_auto]">
        {/* Left — gradient hero + curriculum */}
        <div
          className="relative overflow-hidden p-7 text-white md:p-10"
          style={{
            backgroundImage: `linear-gradient(135deg, ${visual.from} 0%, ${visual.to} 100%)`,
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-black/25 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />

          <div className="relative">
            <div className="flex items-start gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-white/25 backdrop-blur">
                <Icon size={26} strokeWidth={2.1} />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/20 backdrop-blur">
                  <Lock size={11} /> Course-gated
                </span>
                <h2 className="mt-3 font-display text-2xl font-extrabold leading-tight tracking-tight text-white md:text-3xl">
                  Unlock the {label} room
                </h2>
                <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-white/80">
                  {tagline}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Layers size={13} />
                {cohortCount}{" "}
                {cohortCount === 1 ? "live cohort" : "live cohorts"}
              </span>
              {instructorCount > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Users size={13} />
                  {instructorCount}{" "}
                  {instructorCount === 1 ? "instructor" : "instructors"}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Star size={13} className="text-amber-300" />
                3-month full access
              </span>
            </div>

            <div className="mt-6">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/70">
                What you&apos;ll learn
              </p>
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {curriculum.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-2 text-[13px] leading-snug text-white/90"
                  >
                    <Check
                      size={13}
                      strokeWidth={2.6}
                      className="mt-[3px] shrink-0 text-emerald-300"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right — buy panel + free-unlock hint */}
        <div className="flex flex-col gap-4 p-7 md:w-[300px] md:p-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400">
              Course access
            </p>
            <p className="mt-1 font-display text-3xl font-extrabold tnum text-neutral-950">
              {formatPaiseAsINR(COURSE_PRICE_PAISE)}
            </p>
            <p className="text-[12px] text-neutral-500">
              Per course · 3-month access · UPI &amp; cards
            </p>
          </div>

          <div className="space-y-2">
            <AddToCartButton
              id={id}
              size="lg"
              fullWidth
              labels={{
                add: "Add to cart",
                added: "In cart",
              }}
            />
            <Link
              href={`/bootcamps/checkout?course=${id}`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-neutral-700 transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              Buy now <ArrowRight size={13} />
            </Link>
          </div>

          {unlocks.length > 0 ? (
            <div className="rounded-xl bg-amber-50/70 px-3 py-2.5 ring-1 ring-amber-200/60">
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-amber-700">
                <Sparkles size={11} strokeWidth={2.4} />
                Buying this unlocks free
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {unlocks.map((unlocked) => (
                  <UnlockChip key={unlocked} id={unlocked} />
                ))}
              </div>
            </div>
          ) : null}

          <Link
            href="/bootcamps/checkout"
            className="mt-auto inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-brand-primary"
          >
            Or get all 6 for {formatPaiseAsINR(EVERYTHING_BUNDLE_PAISE)} →
          </Link>
        </div>
      </div>

      {/* Cohort preview strip — owners-only content shadowed so non-owners
          understand the room ships real cohorts (not a stub). */}
      {cohortCount > 0 ? (
        <div className="flex items-center gap-3 border-t border-neutral-100 bg-neutral-50/70 px-7 py-4 md:px-10">
          <Lock size={13} className="shrink-0 text-neutral-400" />
          <p className="text-[12.5px] text-neutral-500">
            {cohortCount} cohort{cohortCount === 1 ? "" : "s"} are live in this
            room right now. Buy the course to enter and watch every lesson
            without enrolling per cohort.
          </p>
        </div>
      ) : null}
    </article>
  );
}

function UnlockChip({ id }: { id: BootcampCategory }) {
  const v = COURSE_VISUAL[id];
  const Icon = v.icon;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-[11.5px] font-semibold text-neutral-700 ring-1 ring-amber-200/50">
      <span
        className="grid h-4 w-4 place-items-center rounded-md text-white"
        style={{
          backgroundImage: `linear-gradient(135deg, ${v.from}, ${v.to})`,
        }}
      >
        <Icon size={9} strokeWidth={2.5} />
      </span>
      {roomLabel(id)}
    </span>
  );
}

