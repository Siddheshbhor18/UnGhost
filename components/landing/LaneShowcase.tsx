"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Badge, Button } from "@/components/ui";

/**
 * LaneShowcase — the two product lanes (Bootcamps → Jobs) as full editorial
 * rows with alternating media: text left / visual right, then mirrored.
 *
 * Replaces the old two-up card panel. No section header: each row carries
 * its own hierarchy, and the alternation itself communicates "two lanes".
 *
 * Motion: text and media enter from opposite sides on first scroll into
 * view (house ease curve, once-only). `prefers-reduced-motion` renders the
 * final state with no animation via `initial={false}`.
 *
 * Media assets live in `public/landing/lane-<id>.jpg` (1800×1344, 4:3).
 * The tinted `frameClass` gradient stays behind each photo as the loading
 * backdrop.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

interface Lane {
  id: string;
  badgeTone: "neutral" | "info";
  badgeLabel: string;
  title: string;
  points: string[];
  ctaHref: string;
  ctaLabel: string;
  ctaVariant: "primary" | "secondary";
  /** Media column side on desktop. */
  mediaSide: "left" | "right";
  /** Loading-backdrop tint behind the photo. */
  frameClass: string;
  /** Landing asset path under public/. */
  src: string;
  /** Descriptive alt text for the visual. */
  mediaLabel: string;
}

const LANES: Lane[] = [
  {
    id: "bootcamps",
    badgeTone: "neutral",
    badgeLabel: "Bootcamps",
    title: "Hands-on bootcamps with certifications.",
    points: [
      "Real projects designed by operators, not academics",
      "Code, ship and review from day one",
      "Earn certifications recruiters see on your profile",
    ],
    ctaHref: "#bootcamps",
    ctaLabel: "Explore bootcamps",
    ctaVariant: "primary",
    mediaSide: "right",
    frameClass:
      "bg-gradient-to-br from-neutral-100 via-white to-brand-100/70",
    src: "/landing/lane-bootcamps.jpg",
    mediaLabel:
      "Students building a real project inside an unGhost bootcamp",
  },
  {
    id: "jobs",
    badgeTone: "info",
    badgeLabel: "Jobs",
    title: "Apply with confidence. Replies on the clock.",
    points: [
      "Open roles matched to your skills",
      "Guaranteed response countdowns on every application",
      "Slot returned the instant a recruiter ghosts the window",
    ],
    ctaHref: "/jobs",
    ctaLabel: "Browse live jobs",
    ctaVariant: "primary",
    mediaSide: "left",
    frameClass:
      "bg-gradient-to-br from-brand-100 via-brand-50 to-brand-200/80",
    src: "/landing/lane-jobs.jpg",
    mediaLabel:
      "An application card with its guaranteed reply countdown running",
  },
];

export function LaneShowcase() {
  const reduce = useReducedMotion();
  // SSR ships the fully-visible final state; the hidden entrance pose is armed
  // only after mount on a visible tab, so crawlers and no-JS visitors always
  // see the tiles.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!reduce && document.visibilityState === "visible") setArmed(true);
  }, [reduce]);

  return (
    <section
      aria-label="Two ways to use unGhost: bootcamps and jobs"
      className="overflow-hidden"
    >
      <div className="mx-auto max-w-content px-4 py-16 md:py-24">
        {/* Two large image-forward tiles side by side. A distinct layout family
            from the hero split and the small pricing/storefront card grids: the
            two lanes read as one comparison, not two repeated zigzag rows. */}
        <div className="grid gap-6 md:grid-cols-2 md:gap-8">
          {LANES.map((lane, i) => (
            <LaneTile
              key={`${lane.id}-${armed ? "armed" : "static"}`}
              lane={lane}
              animate={armed}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function LaneTile({
  lane,
  animate,
  index,
}: {
  lane: Lane;
  animate: boolean;
  index: number;
}) {
  return (
    <motion.article
      initial={animate ? { opacity: 0, y: 28 } : false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: EASE, delay: index * 0.1 }}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_32px_80px_-40px_rgba(1,86,158,0.28)]"
    >
      {/* Image-forward header — the large photo is what separates this tile
          family from the icon/text cards elsewhere on the page. */}
      <div className={`relative aspect-[16/10] overflow-hidden ${lane.frameClass}`}>
        <Image
          src={lane.src}
          alt={lane.mediaLabel}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 50vw, 100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 ring-1 ring-inset ring-neutral-950/[0.06]"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-7 md:p-8">
        <Badge tone={lane.badgeTone} className="mb-4 self-start">
          {lane.badgeLabel}
        </Badge>
        <h2 className="font-display font-extrabold text-display-md text-neutral-950 tracking-tight leading-[1.08] [text-wrap:balance]">
          {lane.title}
        </h2>

        <ul className="mt-6 space-y-3.5">
          {lane.points.map((point) => (
            <li
              key={point}
              className="flex items-center gap-3 text-body-md text-neutral-800"
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                  lane.ctaVariant === "primary"
                    ? "bg-brand-500/12 text-brand-600"
                    : "bg-neutral-950/[0.06] text-neutral-700"
                }`}
              >
                <Check size={13} strokeWidth={2.5} />
              </span>
              {point}
            </li>
          ))}
        </ul>

        {/* mt-auto pins the CTA to the tile bottom across uneven point lists. */}
        <div className="mt-auto pt-8">
          <Link href={lane.ctaHref}>
            <Button
              variant={lane.ctaVariant}
              size="lg"
              trailingIcon={<ArrowRight size={15} />}
            >
              {lane.ctaLabel}
            </Button>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
