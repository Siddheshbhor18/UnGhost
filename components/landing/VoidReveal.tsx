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
 * dedicated scroll room before the ticker / next section arrive.
 * Mobile: no pin (a pinned stage taller than the viewport would clip), so the
 * wipe simply scrubs as the block passes.
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
} from "framer-motion";
import { useRef } from "react";

const IMAGE_SIZES = "(min-width: 1024px) 42vw, 100vw";

export function VoidReveal({
  problem,
  payoff,
}: {
  problem: React.ReactNode;
  payoff: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);

  // Progress runs 0 → 1 while the track travels past the pinned stage.
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
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
  // The wide range (~0.54 of the pin ≈ 1.2 viewports) makes it deliberate.
  const wipeTop = useTransform(scrollYProgress, [0.18, 0.72], [100, 0], {
    ease: wipeEase,
  });
  const successClip = useMotionTemplate`inset(${wipeTop}% 0 0 0)`;
  const lineTop = useMotionTemplate`${wipeTop}%`;

  // Slight scale-settle + a focus-pull that resolves as the light arrives.
  const successScale = useTransform(scrollYProgress, [0.18, 0.78], [1.04, 1], {
    ease: wipeEase,
  });
  const successBlurPx = useTransform(scrollYProgress, [0.18, 0.64], [6, 0]);
  const successFilter = useMotionTemplate`blur(${successBlurPx}px)`;

  // The horizon line — a bright warm sweep riding the reveal edge, present
  // only while the wipe is travelling.
  const lineOpacity = useTransform(
    scrollYProgress,
    [0.16, 0.24, 0.68, 0.76],
    [0, 1, 1, 0],
  );

  // Ambient glow warms from night-blue to sunrise-amber across the turn.
  const coolGlow = useTransform(scrollYProgress, [0.32, 0.66], [1, 0.15]);
  const warmGlow = useTransform(scrollYProgress, [0.26, 0.68], [0, 1]);

  // Narrative beats crossfade in lockstep with the wipe: the "problem" copy
  // (shown on arrival) slides up and out as the light rises, and the "payoff"
  // copy slides in as the success frame lands. pointer-events gate so the
  // hidden beat never swallows clicks (e.g. the payoff CTA).
  const problemOpacity = useTransform(scrollYProgress, [0.28, 0.44], [1, 0]);
  const problemY = useTransform(scrollYProgress, [0.28, 0.44], [0, -24]);
  const problemPE = useTransform(scrollYProgress, (p): "auto" | "none" =>
    p < 0.46 ? "auto" : "none",
  );
  const payoffOpacity = useTransform(scrollYProgress, [0.46, 0.64], [0, 1]);
  const payoffY = useTransform(scrollYProgress, [0.46, 0.64], [28, 0]);
  const payoffPE = useTransform(scrollYProgress, (p): "auto" | "none" =>
    p > 0.5 ? "auto" : "none",
  );

  const frame = (
    <div className="relative">
      {/* Night-blue key light — recedes as success blooms. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 blur-3xl"
        style={{
          opacity: reduce ? 1 : coolGlow,
          background:
            "radial-gradient(ellipse at 60% 40%, rgba(1,145,252,0.20), transparent 70%)",
        }}
      />
      {/* Sunrise-amber bloom — fades in behind the success frame. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 blur-3xl"
        style={{
          opacity: reduce ? 0 : warmGlow,
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

        {/* Overlay — the payoff, wiped in bottom-up. Skipped under reduced motion. */}
        {!reduce && (
          <>
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
          </>
        )}
      </div>
    </div>
  );

  // Electric-blue key light behind the headline column — pinned with the stage
  // (so it never slides), and dimmed as the scene warms into the payoff.
  const keyLight = (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-[24%] top-1/2 h-[520px] w-[860px] -translate-x-1/2 -translate-y-1/2 blur-[90px]"
      style={{
        opacity: reduce ? 1 : coolGlow,
        background:
          "radial-gradient(ellipse, rgba(1,145,252,0.20), transparent 62%)",
      }}
    />
  );

  const narrative = reduce ? (
    <div className="space-y-8">
      {problem}
      {payoff}
    </div>
  ) : (
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

  const stage = (
    <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-10">
      <div className="lg:col-span-6">{narrative}</div>
      <div className="lg:col-span-6">{frame}</div>
    </div>
  );

  if (reduce) {
    return (
      <div className="relative mx-auto max-w-content px-4 pt-16 md:pt-24 pb-4 md:pb-8">
        {keyLight}
        {stage}
      </div>
    );
  }

  return (
    <div ref={trackRef} className="relative lg:h-[240vh]">
      <div className="flex min-h-[70vh] items-center lg:sticky lg:top-0 lg:min-h-screen">
        <div className="relative mx-auto w-full max-w-content px-4 py-14 md:py-16">
          {keyLight}
          {stage}
        </div>
      </div>
    </div>
  );
}
