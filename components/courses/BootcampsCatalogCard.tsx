"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, ImageIcon, Sparkles } from "lucide-react";
import { GlassBadge } from "@/components/glass";
import { AddToCartButton } from "@/components/courses/AddToCartButton";
import { COURSE_VISUAL } from "@/components/courses/courseVisuals";
import type { BootcampCategory } from "@/shared/rooms";
import { roomLabel } from "@/shared/rooms";
import { COURSE_PRICE_PAISE, FREE_WITH } from "@/shared/lib/courses";
import { formatPaiseAsINR } from "@/shared/lib/pricing";
import { COURSE_CONTENT } from "@/shared/course-content";
import { safeImageUrl } from "@/shared/lib/safe-image-url";
import Image from "next/image";
import { COURSE_THUMBNAIL } from "@/shared/course-thumbnails";

interface Props {
  id: BootcampCategory;
  label: string;
  blurb: string;
  /** Lucide icon node — used in the thumbnail watermark when no image is set. */
  icon: ReactNode;
  /** Live cohorts for this room — drives the "X cohorts" badge. */
  cohortCount: number;
  /** Optional uploaded thumbnail. When absent we render a branded placeholder
   *  that the recruiter studio can later overwrite by setting this URL. */
  thumbnailUrl?: string;
  /** When true the buyer already owns this course — replaces the
   *  add-to-cart toggle with an "Owned" badge so we don't sell them
   *  what they hold. */
  owned?: boolean;
}

/**
 * Bootcamp catalog card — one per room on `/bootcamps`.
 *
 * Layout, top to bottom:
 *   1. Thumbnail header — a tall gradient panel pulled from `COURSE_VISUAL`.
 *      When `thumbnailUrl` is supplied it overrides the gradient with the
 *      uploaded image; otherwise we paint a designed placeholder so the slot
 *      reads as recruiter-fillable rather than missing.
 *   2. Title + cohort status badge.
 *   3. Tagline + "What you'll learn" bullets (top 3 from COURSE_CONTENT).
 *   4. Free-unlocks chip row — only when this course is an anchor that
 *      unlocks others, so the bundle value is legible at a glance.
 *   5. Footer — price, Enter room link, full-width Add to cart toggle.
 *
 * Card-level interaction model: the card is NOT a single anchor. The title
 * + "Enter room" link both navigate to the room hub; Add to cart toggles
 * cart state without navigating. Splitting these prevents a click on the
 * cart button from being swallowed by an outer Link.
 */
export function BootcampsCatalogCard({
  id,
  label,
  blurb,
  icon,
  cohortCount,
  thumbnailUrl,
  owned = false,
}: Props) {
  const live = cohortCount > 0;
  const visual = COURSE_VISUAL[id];
  const { tagline, curriculum } = COURSE_CONTENT[id];
  const unlocks = FREE_WITH[id];
  const previewLearn = curriculum.slice(0, 3);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_22px_55px_-26px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_34px_75px_-28px_rgba(0,0,0,0.6)]">
      {/* Thumbnail header — placeholder gradient OR uploaded image. */}
      <Thumbnail
        id={id}
        icon={icon}
        label={label}
        thumbnailUrl={thumbnailUrl}
        cohortCount={cohortCount}
        live={live}
      />

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <Link
          href={`/bootcamps/${id}`}
          className="group/link flex flex-col gap-1.5"
        >
          <h3 className="font-display text-xl font-extrabold leading-tight tracking-tight text-neutral-950 transition-colors group-hover/link:text-brand-primary">
            {label}
          </h3>
          <p
            className="text-[12.5px] font-semibold uppercase tracking-wider"
            style={{ color: visual.to }}
          >
            {tagline}
          </p>
        </Link>

        <p className="mt-3 text-[13.5px] leading-relaxed text-neutral-500">
          {blurb}
        </p>

        {/* What you'll learn */}
        <div className="mt-4">
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-neutral-400">
            What you&apos;ll learn
          </p>
          <ul className="space-y-1.5">
            {previewLearn.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-2 text-[13px] leading-snug text-neutral-700"
              >
                <Check
                  size={13}
                  strokeWidth={2.6}
                  className="mt-[3px] shrink-0"
                  style={{ color: visual.to }}
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Free unlocks */}
        {unlocks.length > 0 ? (
          <div className="mt-4 rounded-xl bg-amber-50/70 px-3 py-2.5 ring-1 ring-amber-200/60">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-amber-700">
              <Sparkles size={11} strokeWidth={2.4} />
              Buying this unlocks free
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {unlocks.map((unlocked) => (
                <FreeUnlockChip key={unlocked} id={unlocked} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Footer pinned to the bottom for grid alignment */}
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
            <span className="font-display text-lg font-extrabold tnum text-neutral-950">
              {owned ? (
                <span className="text-base font-bold text-emerald-600">
                  Yours
                </span>
              ) : (
                <>
                  {formatPaiseAsINR(COURSE_PRICE_PAISE)}
                  <span className="ml-1 text-[11px] font-normal text-neutral-400">
                    · 3 months
                  </span>
                </>
              )}
            </span>
            <Link
              href={`/bootcamps/${id}`}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-primary transition-all hover:gap-2"
            >
              {owned ? "Open room" : "Enter room"} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-3">
            {owned ? (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-[13.5px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <Check size={15} strokeWidth={2.6} /> You own this course
              </div>
            ) : (
              <AddToCartButton
                id={id}
                size="md"
                fullWidth
                labels={{ add: "Add to cart", added: "In cart" }}
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Thumbnail ──────────────────────────────────────────────────────────────

function Thumbnail({
  id,
  icon,
  label,
  thumbnailUrl,
  cohortCount,
  live,
}: {
  id: BootcampCategory;
  icon: ReactNode;
  label: string;
  thumbnailUrl?: string;
  cohortCount: number;
  live: boolean;
}) {
  const v = COURSE_VISUAL[id];
  // Validate the URL against the first-party / trusted CDN allowlist before
  // we render an <img>. Anything else falls through to the gradient
  // placeholder so a hostile thumbnailUrl can't beacon to a third-party host
  // or downgrade the page to mixed content.
  const safeThumb = safeImageUrl(thumbnailUrl);
  if (safeThumb) {
    return (
      <div className="relative h-44 w-full overflow-hidden">
        {/* Uploaded thumbnail — recruiter-supplied. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={safeThumb}
          alt={`${label} thumbnail`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0"
        />
        <CohortBadge live={live} cohortCount={cohortCount} overlay />
      </div>
    );
  }
  // No recruiter upload, but this room ships a stock category thumbnail.
  const categoryThumb = COURSE_THUMBNAIL[id];
  if (categoryThumb) {
    return (
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={categoryThumb}
          alt={`${label} bootcamp`}
          fill
          sizes="(max-width: 768px) 100vw, 400px"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0"
        />
        <CohortBadge live={live} cohortCount={cohortCount} overlay />
      </div>
    );
  }
  return (
    <div
      className="relative h-44 w-full overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(135deg, ${v.from} 0%, ${v.to} 100%)`,
      }}
    >
      {/* Soft radial halo for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-black/20 blur-2xl"
      />
      {/* Dot grid pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      {/* Watermark icon — large, faded, sits behind the centered emblem */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-6 -right-2 text-white/15"
      >
        <span className="block [&>svg]:h-40 [&>svg]:w-40">{icon}</span>
      </div>
      {/* Centered emblem */}
      <div className="absolute inset-0 grid place-items-center">
        <div
          className="grid h-16 w-16 place-items-center rounded-2xl bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_30px_rgba(0,0,0,0.25)] ring-1 ring-white/30 backdrop-blur transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:rotate-[-3deg]"
        >
          <span className="[&>svg]:h-7 [&>svg]:w-7">{icon}</span>
        </div>
      </div>
      {/* Bottom-left "placeholder" hint — reads as recruiter-fillable */}
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/90 ring-1 ring-white/15 backdrop-blur">
        <ImageIcon size={10} strokeWidth={2.4} /> Thumbnail
      </div>
      <CohortBadge live={live} cohortCount={cohortCount} overlay />
    </div>
  );
}

function CohortBadge({
  live,
  cohortCount,
  overlay,
}: {
  live: boolean;
  cohortCount: number;
  overlay?: boolean;
}) {
  return (
    <div className={overlay ? "absolute right-3 top-3" : ""}>
      {live ? (
        <GlassBadge tone="success">
          {cohortCount} {cohortCount === 1 ? "cohort" : "cohorts"}
        </GlassBadge>
      ) : (
        <GlassBadge tone="warn">First cohort forming</GlassBadge>
      )}
    </div>
  );
}

// ─── Free-unlock chip ───────────────────────────────────────────────────────

function FreeUnlockChip({ id }: { id: BootcampCategory }) {
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
