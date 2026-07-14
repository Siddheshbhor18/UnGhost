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
const SLIDE = 56;

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
  // Reveal animations must enhance an already-visible default: the SSR
  // markup carries NO hidden state, so crawlers, no-JS visitors, and hidden
  // tabs (where framer's rAF loop is paused) always see the section. After
  // mount on a VISIBLE tab we arm the entrance by remounting the rows with
  // their hidden initial pose — below the fold, so the swap is unseen.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!reduce && document.visibilityState === "visible") setArmed(true);
  }, [reduce]);

  return (
    <section
      aria-label="Two ways to use unGhost: bootcamps and jobs"
      className="overflow-hidden"
    >
      <div className="mx-auto max-w-content px-4 py-20 md:py-32">
        <div className="space-y-32 md:space-y-64">
          {LANES.map((lane) => (
            <LaneRow
              key={`${lane.id}-${armed ? "armed" : "static"}`}
              lane={lane}
              animate={armed}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function LaneRow({ lane, animate }: { lane: Lane; animate: boolean }) {
  const mediaLeft = lane.mediaSide === "left";
  const textFrom = mediaLeft ? SLIDE : -SLIDE;
  const mediaFrom = mediaLeft ? -SLIDE : SLIDE;

  return (
    <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-32">
      {/* ── Copy column ── */}
      <motion.div
        initial={animate ? { opacity: 0, x: textFrom } : false}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.8, ease: EASE }}
        className={mediaLeft ? "lg:order-last lg:pl-16" : "lg:pr-16"}
      >
        <Badge tone={lane.badgeTone} className="mb-6">
          {lane.badgeLabel}
        </Badge>
        <h2 className="font-display font-extrabold text-display-lg text-neutral-950 tracking-tight leading-[1.05] [text-wrap:balance]">
          {lane.title}
        </h2>

        <ul className="mt-8">
          {lane.points.map((point, i) => (
            <motion.li
              key={point}
              initial={animate ? { opacity: 0, x: textFrom / 2 } : false}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{
                duration: 0.6,
                ease: EASE,
                delay: 0.25 + i * 0.09,
              }}
              className="flex items-center gap-3.5 py-4 text-body-md text-neutral-800"
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
            </motion.li>
          ))}
        </ul>

        <div className="mt-9">
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
      </motion.div>

      {/* ── Media column ── */}
      <motion.div
        initial={animate ? { opacity: 0, x: mediaFrom, scale: 0.97 } : false}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        className={mediaLeft ? "lg:order-first" : undefined}
      >
        <div
          data-media-slot={lane.id}
          className={`relative aspect-[4/3] overflow-hidden rounded-2xl shadow-[0_32px_80px_-32px_rgba(1,86,158,0.28)] ${lane.frameClass}`}
        >
          <Image
            src={lane.src}
            alt={lane.mediaLabel}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
          <div
            aria-hidden
            className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-neutral-950/[0.06]"
          />
        </div>
      </motion.div>
    </div>
  );
}
