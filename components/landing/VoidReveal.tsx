"use client";

/**
 * VoidReveal — the void section's scroll-scrubbed turn. As the beat is pinned
 * to the viewport, `thesuccess.png` is wiped in over `thevoid.png` bottom-up
 * like a rising horizon of light (a "dawn wipe"): the dark "Application
 * Submitted, then silence" night resolves into the sunrise payoff. The
 * two narrative beats (`problem`, `payoff`) are passed in so page.tsx keeps
 * ownership of the copy; this component orchestrates their scroll-linked
 * crossfade in lockstep with the wipe, and owns the pinned stage + imagery.
 *
 * Desktop (lg+): a tall scroll-track pins a `sticky` stage, giving the wipe
 * dedicated scroll room before the ticker / next section arrive. Progress is
 * measured across the pin ("start start" → "end end").
 * Mobile: no pin (a pinned stage taller than the viewport would clip), so the
 * wipe scrubs as the block passes THROUGH the viewport ("start end" →
 * "end start"). The two modes need different offsets: the pinned offsets are
 * degenerate when the track is shorter than the viewport (the "end end"
 * waypoint precedes "start start"), which ran the whole story BACKWARDS on
 * phones — payoff first, dissolving back into the void. The mode is detected
 * with a matchMedia listener and the scrub subtree is keyed on it so
 * useScroll re-initialises with the right offsets.
 * Reduced motion: static two-column — void image + both text beats, no scrub.
 */

import Image from "next/image";
import {
  motion,
  useScroll,
  useTransform,
  useMotionTemplate,
  useReducedMotion,
  cubicBezier,
  type MotionValue,
} from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const IMAGE_SIZES = "(min-width: 1024px) 42vw, 100vw";

// SSR renders neither mode's scroll values (no window), so the layout effect
// only matters client-side; the fallback keeps React from warning during SSR.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Scroll waypoints for each beat, per mode. Pinned values are tuned for the
 *  240vh pin; flow values for a ~1.6-viewport passage (stops sit later so the
 *  turn happens while the section is centred on screen, not while entering). */
const STOPS = {
  pinned: {
    wipe: [0.18, 0.72] as [number, number],
    scale: [0.18, 0.78] as [number, number],
    blur: [0.18, 0.64] as [number, number],
    line: [0.16, 0.24, 0.68, 0.76] as [number, number, number, number],
    cool: [0.32, 0.66] as [number, number],
    warm: [0.26, 0.68] as [number, number],
    problem: [0.28, 0.44] as [number, number],
    payoff: [0.46, 0.64] as [number, number],
    problemGate: 0.46,
    payoffGate: 0.5,
  },
  flow: {
    wipe: [0.35, 0.78] as [number, number],
    scale: [0.35, 0.82] as [number, number],
    blur: [0.35, 0.72] as [number, number],
    line: [0.33, 0.41, 0.74, 0.81] as [number, number, number, number],
    cool: [0.45, 0.72] as [number, number],
    warm: [0.4, 0.74] as [number, number],
    problem: [0.42, 0.56] as [number, number],
    payoff: [0.58, 0.72] as [number, number],
    problemGate: 0.57,
    payoffGate: 0.58,
  },
};

export function VoidReveal({
  problem,
  payoff,
}: {
  problem: React.ReactNode;
  payoff: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  // false (mobile flow) until measured — the layout itself is CSS-driven, so a
  // desktop first paint still lays out pinned; only the scrub offsets swap in.
  const [pinned, setPinned] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setPinned(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (reduce) {
    return (
      <div className="relative mx-auto max-w-content px-4 pt-16 md:pt-24 pb-4 md:pb-8">
        <KeyLight coolGlow={null} />
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-10">
          <div className="lg:col-span-6">
            <div className="space-y-8">
              {problem}
              {payoff}
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.85)]">
                <Image
                  src="/thevoid.png"
                  alt="A job-seeker alone at night, staring at an 'Application Submitted' screen — and the silence that follows."
                  fill
                  sizes={IMAGE_SIZES}
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VoidRevealScrub
      key={pinned ? "pinned" : "flow"}
      pinned={pinned}
      problem={problem}
      payoff={payoff}
    />
  );
}

function VoidRevealScrub({
  pinned,
  problem,
  payoff,
}: {
  pinned: boolean;
  problem: React.ReactNode;
  payoff: React.ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const S = STOPS[pinned ? "pinned" : "flow"];

  // Pinned: progress runs 0 → 1 while the track travels past the pinned
  // stage. Flow: 0 → 1 while the (unpinned) block crosses the viewport.
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: pinned ? ["start start", "end end"] : ["start end", "end start"],
  });

  // Gentle, near-symmetric ease with soft ends. A punchy curve would bunch the
  // travel into the middle (fast = the "too quick" feel); since the user's
  // scroll already drives the rate, a soft curve keeps the wipe steady and
  // readable the whole way up.
  const wipeEase = cubicBezier(0.42, 0, 0.58, 1);

  // Dawn wipe: the payoff is revealed bottom-up like a rising horizon of
  // light. `inset(top …)` shrinks from 100% → 0%, so the visible band of
  // thesuccess.png grows upward from the base. The void underneath simply
  // gets uncovered — no crossfade, so there is never a muddy double-image.
  const wipeTop = useTransform(scrollYProgress, S.wipe, [100, 0], {
    ease: wipeEase,
  });
  const successClip = useMotionTemplate`inset(${wipeTop}% 0 0 0)`;
  const lineTop = useMotionTemplate`${wipeTop}%`;

  // Slight scale-settle + a focus-pull that resolves as the light arrives.
  const successScale = useTransform(scrollYProgress, S.scale, [1.04, 1], {
    ease: wipeEase,
  });
  const successBlurPx = useTransform(scrollYProgress, S.blur, [6, 0]);
  const successFilter = useMotionTemplate`blur(${successBlurPx}px)`;

  // The horizon line — a bright warm sweep riding the reveal edge, present
  // only while the wipe is travelling.
  const lineOpacity = useTransform(scrollYProgress, S.line, [0, 1, 1, 0]);

  // Ambient glow warms from night-blue to sunrise-amber across the turn.
  const coolGlow = useTransform(scrollYProgress, S.cool, [1, 0.15]);
  const warmGlow = useTransform(scrollYProgress, S.warm, [0, 1]);

  // Narrative beats crossfade in lockstep with the wipe: the "problem" copy
  // (shown on arrival) slides up and out as the light rises, and the "payoff"
  // copy slides in as the success frame lands. pointer-events gate so the
  // hidden beat never swallows clicks (e.g. the payoff CTA).
  const problemOpacity = useTransform(scrollYProgress, S.problem, [1, 0]);
  const problemY = useTransform(scrollYProgress, S.problem, [0, -24]);
  const problemPE = useTransform(scrollYProgress, (p): "auto" | "none" =>
    p < S.problemGate ? "auto" : "none",
  );
  const payoffOpacity = useTransform(scrollYProgress, S.payoff, [0, 1]);
  const payoffY = useTransform(scrollYProgress, S.payoff, [28, 0]);
  const payoffPE = useTransform(scrollYProgress, (p): "auto" | "none" =>
    p > S.payoffGate ? "auto" : "none",
  );

  const frame = (
    <div className="relative">
      {/* Night-blue key light — recedes as success blooms. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 blur-3xl"
        style={{
          opacity: coolGlow,
          background:
            "radial-gradient(ellipse at 60% 40%, rgba(1,145,252,0.20), transparent 70%)",
        }}
      />
      {/* Sunrise-amber bloom — fades in behind the success frame. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 blur-3xl"
        style={{
          opacity: warmGlow,
          background:
            "radial-gradient(ellipse at 62% 46%, rgba(255,168,74,0.28), transparent 68%)",
        }}
      />

      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-[0_30px_90px_-24px_rgba(0,0,0,0.85)]">
        {/* Base — the void. Stays put; the wipe simply uncovers the payoff. */}
        <div className="absolute inset-0">
          <Image
            src="/thevoid.png"
            alt="A job-seeker alone at night, staring at an 'Application Submitted' screen — and the silence that follows."
            fill
            sizes={IMAGE_SIZES}
            className="object-cover"
          />
        </div>

        <motion.div
          className="absolute inset-0"
          style={{
            clipPath: successClip,
            WebkitClipPath: successClip,
            scale: successScale,
            filter: successFilter,
            willChange: "clip-path, transform, filter",
          }}
        >
          <Image
            src="/thesuccess.png"
            alt="The same person at a corner-office desk at sunrise, coffee in hand, the city skyline glowing — the payoff after the silence."
            fill
            sizes={IMAGE_SIZES}
            className="object-cover"
          />
        </motion.div>

        {/* Rising horizon of light — a warm sweep tracking the reveal edge. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-24 -translate-y-1/2"
          style={{
            top: lineTop,
            opacity: lineOpacity,
            background:
              "linear-gradient(to top, transparent, rgba(255,176,102,0.35) 42%, rgba(255,231,199,0.95) 50%, rgba(255,176,102,0.35) 58%, transparent)",
            filter: "blur(6px)",
            mixBlendMode: "screen",
            willChange: "top, opacity",
          }}
        />
      </div>
    </div>
  );

  const narrative = (
    <div className="grid items-center">
      <motion.div
        className="[grid-area:1/1]"
        style={{ opacity: problemOpacity, y: problemY, pointerEvents: problemPE }}
      >
        {problem}
      </motion.div>
      <motion.div
        className="[grid-area:1/1]"
        style={{ opacity: payoffOpacity, y: payoffY, pointerEvents: payoffPE }}
      >
        {payoff}
      </motion.div>
    </div>
  );

  return (
    <div ref={trackRef} className="relative lg:h-[240vh]">
      <div className="flex min-h-[70vh] items-center lg:sticky lg:top-0 lg:min-h-screen">
        <div className="relative mx-auto w-full max-w-content px-4 py-14 md:py-16">
          <KeyLight coolGlow={coolGlow} />
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-10">
            <div className="lg:col-span-6">{narrative}</div>
            <div className="lg:col-span-6">{frame}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Electric-blue key light behind the headline column — pinned with the stage
 *  (so it never slides), and dimmed as the scene warms into the payoff.
 *  `coolGlow` is null in the static reduced-motion branch (full opacity). */
function KeyLight({
  coolGlow,
}: {
  coolGlow: MotionValue<number> | null;
}) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-[24%] top-1/2 h-[520px] w-[860px] -translate-x-1/2 -translate-y-1/2 blur-[90px]"
      style={{
        opacity: coolGlow ?? 1,
        background:
          "radial-gradient(ellipse, rgba(1,145,252,0.20), transparent 62%)",
      }}
    />
  );
}
