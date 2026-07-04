"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Briefcase,
  Check,
  Handshake,
  Layers,
  Megaphone,
  Plus,
  Rocket,
  ShoppingCart,
  Sparkles,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { ROOMS, roomLabel, type BootcampCategory } from "@/shared/rooms";
import {
  COURSE_IDS,
  COURSE_PRICE_PAISE,
  EVERYTHING_BUNDLE_PAISE,
  FREE_WITH,
  everythingSelection,
  resolveCart,
} from "@/shared/lib/courses";
import { formatPaiseAsINR } from "@/shared/lib/pricing";
import { useCourseCart } from "@/components/courses/cartStore";
import { Button } from "@/components/ui";
import { StaggerGrid, StaggerItem } from "@/components/landing/motion";

/** Per-course accent — the single splash of colour on each white card, matching
 *  the JobMarquee avatar treatment. `glow` is the RGB triple for the halo. */
interface CourseTheme {
  Icon: LucideIcon;
  from: string;
  to: string;
  glow: string;
}

const COURSE_THEME: Record<BootcampCategory, CourseTheme> = {
  ai: { Icon: Brain, from: "#8B5CF6", to: "#6D28D9", glow: "139,92,246" },
  gtm: { Icon: Workflow, from: "#0191FC", to: "#0166C8", glow: "1,145,252" },
  marketing: { Icon: Megaphone, from: "#F43F5E", to: "#E11D48", glow: "244,63,94" },
  sales: { Icon: Handshake, from: "#10B981", to: "#059669", glow: "16,185,129" },
  entrepreneurship: { Icon: Rocket, from: "#F59E0B", to: "#D97706", glow: "245,158,11" },
  freelancing: { Icon: Briefcase, from: "#06B6D4", to: "#0891B2", glow: "6,182,212" },
};

/** Free unlock hint — always naming the actual courses the buyer gets so the
 *  page doesn't leave them guessing (previously said just "the other three
 *  for free" which forced a click). Uses `FREE_WITH` + `roomLabel` so the
 *  copy stays synced with the bundle engine automatically. */
function bundleHint(id: BootcampCategory): string {
  const freeIds = FREE_WITH[id];
  if (freeIds.length === 0) return "";
  const labels = freeIds.map((f) => roomLabel(f));
  const joined =
    labels.length <= 2
      ? labels.join(" & ")
      : `${labels.slice(0, -1).join(", ")} & ${labels[labels.length - 1]}`;
  return `Includes ${joined} FREE`;
}

const COURSE_PRICE = formatPaiseAsINR(COURSE_PRICE_PAISE);
const EVERYTHING_PRICE = formatPaiseAsINR(EVERYTHING_BUNDLE_PAISE);
const EVERYTHING_LIST_PRICE = formatPaiseAsINR(
  COURSE_IDS.length * COURSE_PRICE_PAISE,
);
const EVERYTHING_SAVINGS = formatPaiseAsINR(
  COURSE_IDS.length * COURSE_PRICE_PAISE - EVERYTHING_BUNDLE_PAISE,
);

function CourseCard({
  room,
  inCart,
  onToggle,
}: {
  room: (typeof ROOMS)[number];
  inCart: boolean;
  onToggle: (id: BootcampCategory) => void;
}) {
  const theme = COURSE_THEME[room.id];
  const { Icon } = theme;
  return (
    <div className="group relative flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_22px_50px_-26px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_34px_70px_-28px_rgba(0,0,0,0.65)]">
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
          style={{
            backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
            boxShadow: `0 8px 20px rgba(${theme.glow},0.4), inset 0 1px 0 rgba(255,255,255,0.35)`,
          }}
        >
          <Icon size={22} strokeWidth={2.1} />
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-extrabold tracking-tight text-neutral-950 tnum">
            {COURSE_PRICE}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-700">
            per course · 3 months
          </p>
        </div>
      </div>

      <h3 className="mt-5 font-display text-lg font-bold text-neutral-900">
        {room.label}
      </h3>
      <p className="mt-1.5 flex-1 text-base leading-relaxed text-neutral-900">
        {room.blurb}
      </p>

      <div className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full bg-neutral-50 px-2.5 py-1 ring-1 ring-black/[0.04]">
        <Sparkles size={12} style={{ color: theme.to }} className="shrink-0" />
        <span className="text-[11.5px] font-medium text-neutral-600">
          {bundleHint(room.id)}
        </span>
      </div>

      <Button
        variant={inCart ? "secondary" : "primary"}
        size="md"
        fullWidth
        className="mt-5"
        onClick={() => onToggle(room.id)}
        aria-pressed={inCart}
        leadingIcon={inCart ? <Check size={15} /> : <Plus size={15} />}
      >
        {inCart ? "Added" : "Add to cart"}
      </Button>
    </div>
  );
}

function EverythingBanner({
  allAdded,
  onAddAll,
}: {
  allAdded: boolean;
  onAddAll: () => void;
}) {
  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl bg-brand-100/80 p-8 ring-1 ring-brand-300/60 shadow-elev-3 md:p-10">
      <div className="relative flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-600 ring-1 ring-brand-500/20">
            <Layers size={12} /> Everything bundle
          </span>
          <h3 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-neutral-950 md:text-3xl">
            All six courses. One price.
          </h3>
          <p className="mt-2 text-base leading-relaxed text-neutral-900">
            Every room (AI, GTM, Marketing, Sales, Entrepreneurship &amp;
            Freelancing) unlocked for life.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {ROOMS.map((r) => {
              const t = COURSE_THEME[r.id];
              const I = t.Icon;
              return (
                <span
                  key={r.id}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                  style={{
                    backgroundImage: `linear-gradient(135deg,${t.from},${t.to})`,
                    boxShadow: `0 4px 12px rgba(${t.glow},0.45)`,
                  }}
                  title={r.label}
                >
                  <I size={15} strokeWidth={2.2} />
                </span>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 md:text-right">
          <div className="flex items-baseline gap-2 md:justify-end">
            <span className="font-display text-4xl font-extrabold tracking-tight text-neutral-950 tnum">
              {EVERYTHING_PRICE}
            </span>
            <span className="text-base text-neutral-700 line-through tnum">
              {EVERYTHING_LIST_PRICE}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-success">
            Save {EVERYTHING_SAVINGS}
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-5 w-full md:w-auto"
            onClick={onAddAll}
            disabled={allAdded}
            leadingIcon={
              allAdded ? <Check size={16} /> : <Sparkles size={16} />
            }
          >
            {allAdded ? "All six in cart" : "Add all six"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CartBar({ items }: { items: BootcampCategory[] }) {
  const resolved = resolveCart(items);
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 px-4"
    >
      <div className="flex items-center gap-4 rounded-full bg-neutral-950/95 py-2.5 pl-5 pr-2.5 text-white shadow-[0_18px_45px_-12px_rgba(0,0,0,0.7)] ring-1 ring-white/10 backdrop-blur">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
          <ShoppingCart size={16} />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold tnum">
            {items.length}
          </span>
        </span>
        <div className="leading-tight">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            {resolved.isEverything
              ? "Everything bundle"
              : `${items.length} ${items.length === 1 ? "course" : "courses"}`}
          </p>
          <p className="font-display text-base font-bold tnum">
            {formatPaiseAsINR(resolved.pricePaise)}
          </p>
        </div>
        <Link href="/bootcamps/checkout">
          <Button variant="primary" size="sm" trailingIcon={<ArrowRight size={14} />}>
            View cart
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

/**
 * Landing bootcamp storefront: a premium grid of the 6 course cards (driven by
 * ROOMS), the Everything-bundle banner, and a floating cart summary. All cart
 * reads are mounted-guarded so the persisted (localStorage) store never trips a
 * hydration mismatch.
 */
export function CoursesSection() {
  const items = useCourseCart((s) => s.items);
  const toggle = useCourseCart((s) => s.toggle);
  const setAll = useCourseCart((s) => s.setAll);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const allAdded = mounted && COURSE_IDS.every((id) => items.includes(id));

  return (
    <>
      <StaggerGrid
        className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        stagger={0.06}
      >
        {ROOMS.map((room) => (
          <StaggerItem key={room.id} className="h-full">
            <CourseCard
              room={room}
              inCart={mounted && items.includes(room.id)}
              onToggle={toggle}
            />
          </StaggerItem>
        ))}
      </StaggerGrid>

      <EverythingBanner
        allAdded={allAdded}
        onAddAll={() => setAll(everythingSelection())}
      />

      <AnimatePresence>
        {mounted && items.length > 0 && <CartBar items={items} />}
      </AnimatePresence>
    </>
  );
}
