"use client";

import Link from "next/link";
import { ArrowRight, Check, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { useCourseCart } from "@/components/courses/cartStore";
import { useHasMounted } from "@/components/lib/useHasMounted";
import { COURSE_VISUAL } from "@/components/courses/courseVisuals";
import { ROOMS } from "@/shared/rooms";
import {
  COURSE_IDS,
  COURSE_PRICE_PAISE,
  EVERYTHING_BUNDLE_PAISE,
  everythingSelection,
} from "@/shared/lib/courses";
import { formatPaiseAsINR } from "@/shared/lib/pricing";

interface Props {
  /** Grid-spanning className — defaults to a full-width tile in the
   *  standard `sm:grid-cols-2 lg:grid-cols-3` catalog grid. Pass an
   *  override if the host grid uses a different track count. */
  className?: string;
  /** Number of courses the buyer already owns. Drives the "all owned"
   *  state (bundle CTA collapses to a "go to my courses" affordance) and
   *  the partial-owned hint copy. Server-rendered so it stays SSR-stable. */
  ownedCount?: number;
}

const EVERYTHING_PRICE = formatPaiseAsINR(EVERYTHING_BUNDLE_PAISE);
const EVERYTHING_LIST_PRICE = formatPaiseAsINR(
  COURSE_IDS.length * COURSE_PRICE_PAISE,
);
const EVERYTHING_SAVINGS = formatPaiseAsINR(
  COURSE_IDS.length * COURSE_PRICE_PAISE - EVERYTHING_BUNDLE_PAISE,
);

/**
 * Catalog tile for the ₹11,999 Everything bundle — the seventh slot on
 * `/bootcamps`. Mirrors the landing's `EverythingBanner` aesthetic (dark
 * gradient, six course emblems, savings call-out, primary "Add all six"
 * CTA) but constrained to a card that spans the full grid width below the
 * individual room cards, so buyers evaluate the courses first and meet the
 * bundle deal as the natural close.
 *
 * Cart wiring goes through the same `setAll(everythingSelection())` path
 * the landing banner uses — one source of truth for cart state means the
 * "already added" indicator and the cart count badge stay in sync across
 * surfaces.
 *
 * Mounted-guarded so the "all six in cart" disabled state never flashes
 * during hydration on the SSR'd `/bootcamps` shell.
 */
export function EverythingBundleCard({
  className,
  ownedCount = 0,
}: Props) {
  const items = useCourseCart((s) => s.items);
  const setAll = useCourseCart((s) => s.setAll);
  const mounted = useHasMounted();
  const allOwned = ownedCount >= COURSE_IDS.length;
  const partialOwned = !allOwned && ownedCount > 0;
  const allAdded = mounted && COURSE_IDS.every((id) => items.includes(id));

  return (
    <article
      className={[
        "relative overflow-hidden rounded-3xl p-7 md:p-9 ring-1 ring-white/10",
        "shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]",
        className ?? "sm:col-span-2 lg:col-span-3",
      ].join(" ")}
      style={{
        backgroundImage:
          "linear-gradient(135deg,#0B1220 0%,#16233f 55%,#0a1a36 100%)",
      }}
    >
      {/* Halo accents — same treatment as the landing banner for visual
          continuity between the two surfaces. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white ring-1 ring-white/15 backdrop-blur">
            <Layers size={12} /> Everything bundle
          </span>
          <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-white md:text-3xl">
            All six courses. One price.
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Every room — AI, GTM, Marketing, Sales, Entrepreneurship &amp;
            Freelancing — unlocked together. 3 months of access on each
            course, all the live sessions, every skill-verify badge.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {ROOMS.map((room) => {
              const v = COURSE_VISUAL[room.id];
              const Icon = v.icon;
              return (
                <span
                  key={room.id}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${v.from}, ${v.to})`,
                    boxShadow: `0 4px 12px rgba(${v.glow},0.45), inset 0 1px 0 rgba(255,255,255,0.35)`,
                  }}
                  title={room.label}
                  aria-label={room.label}
                >
                  <Icon size={16} strokeWidth={2.2} />
                </span>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 md:text-right">
          <div className="flex items-baseline gap-2 md:justify-end">
            <span className="font-display text-4xl font-extrabold tracking-tight tnum text-white">
              {EVERYTHING_PRICE}
            </span>
            <span className="text-base text-white/40 line-through tnum">
              {EVERYTHING_LIST_PRICE}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-emerald-300">
            Save {EVERYTHING_SAVINGS} vs buying individually
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row md:flex-col md:items-end">
            {allOwned ? (
              <Link href="/dashboard" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  trailingIcon={<ArrowRight size={16} />}
                  leadingIcon={<Check size={16} />}
                >
                  You own all six
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto md:w-auto"
                  onClick={() => setAll(everythingSelection())}
                  disabled={allAdded}
                  leadingIcon={
                    allAdded ? <Check size={16} /> : <Sparkles size={16} />
                  }
                >
                  {allAdded ? "All six in cart" : "Add all six"}
                </Button>
                <Link href="/bootcamps/checkout" className="w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    trailingIcon={<ArrowRight size={16} />}
                    className="bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/15"
                  >
                    {allAdded ? "Go to checkout" : "View cart"}
                  </Button>
                </Link>
              </>
            )}
          </div>
          {partialOwned ? (
            <p className="mt-3 text-[11px] text-white/55">
              You already own {ownedCount} of {COURSE_IDS.length}. Cart
              pricing applies only to the remaining courses.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
