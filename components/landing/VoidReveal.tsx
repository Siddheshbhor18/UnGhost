"use client";

/**
 * VoidReveal — the void section's scroll-scrubbed turn, staged full-bleed.
 *
 * The imagery IS the stage: thevoid.png fills the pinned viewport, and the
 * payoff (thesuccess.png) wipes over it bottom-up like a rising dawn, a warm
 * horizon line riding the reveal edge across the full width of the screen.
 * The narrative beats (left) and the receipt artifacts (right) crossfade in
 * lockstep with the wipe:
 *
 *   problem  — "You apply. / Then nothing."  + <GhostReceipt />  (the
 *              application that fades into silence)
 *   payoff   — "So we changed who pays…"     + <AnswerReceipt /> (the same
 *              application, answered inside a locked reply window)
 *
 * Same shape, opposite endings — the mechanic shown as evidence twice.
 *
 * Desktop (lg+): a tall scroll-track pins a `sticky` stage; progress is
 * measured across the pin ("start start" → "end end").
 * Mobile: no pin (a pinned stage taller than the viewport would clip), so
 * the wipe scrubs as the block passes THROUGH the viewport ("start end" →
 * "end start"). The two modes need different offsets: the pinned offsets are
 * degenerate when the track is shorter than the viewport, which would run
 * the story backwards on phones. The mode is detected with a matchMedia
 * listener and the scrub subtree is keyed on it so useScroll re-initialises.
 * Reduced motion: static full-bleed void + both text beats + the ghost
 * receipt in its finished state, no scrub.
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
import { GhostReceipt } from "@/components/landing/GhostReceipt";
import { AnswerReceipt } from "@/components/landing/AnswerReceipt";

// SSR renders neither mode's scroll values (no window), so the layout effect
// only matters client-side; the fallback keeps React from warning during SSR.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Scroll waypoints for each beat, per mode. Pinned values are tuned for the
 *  260vh pin; flow values for a ~1.6-viewport passage (stops sit later so the
 *  turn happens while the section is centred on screen, not while entering). */
const STOPS = {
  pinned: {
    wipe: [0.18, 0.72] as [number, number],
    scale: [0.18, 0.78] as [number, number],
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
    line: [0.33, 0.41, 0.74, 0.81] as [number, number, number, number],
    cool: [0.45, 0.72] as [number, number],
    warm: [0.4, 0.74] as [number, number],
    problem: [0.42, 0.56] as [number, number],
    payoff: [0.58, 0.72] as [number, number],
    problemGate: 0.57,
    payoffGate: 0.58,
  },
};

const VOID_ALT =
  "A job-seeker alone at night, staring at an 'Application Submitted' screen — and the silence that follows.";
const SUCCESS_ALT =
  "The same person at a corner-office desk at sunrise, coffee in hand, the city skyline glowing — the payoff after the silence.";

/** Left-side legibility scrim — display type sits on photography. */
const TEXT_SCRIM =
  "linear-gradient(to right, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.6) 34%, rgba(0,0,0,0.22) 58%, rgba(0,0,0,0.05) 78%, transparent 100%)";
/** Grounds the stage into the black section (ticker follows below). */
const EDGE_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 18%), linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 14%)";

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
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/thevoid.png"
            alt={VOID_ALT}
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div aria-hidden className="absolute inset-0" style={{ background: TEXT_SCRIM }} />
          <div aria-hidden className="absolute inset-0" style={{ background: EDGE_SCRIM }} />
        </div>
        <div className="relative mx-auto grid max-w-content grid-cols-1 items-center gap-12 px-4 py-20 md:py-28 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-10 lg:col-span-6">
            {problem}
            {payoff}
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <GhostReceipt />
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
  // travel into the middle; the user's scroll already drives the rate, so a
  // soft curve keeps the wipe steady and readable the whole way up.
  const wipeEase = cubicBezier(0.42, 0, 0.58, 1);

  // Dawn wipe: the payoff is revealed bottom-up like a rising horizon of
  // light across the WHOLE viewport. `inset(top …)` shrinks from 100% → 0%,
  // so the visible band of thesuccess.png grows upward from the base. The
  // void underneath simply gets uncovered — never a muddy double-image.
  const wipeTop = useTransform(scrollYProgress, S.wipe, [100, 0], {
    ease: wipeEase,
  });
  const successClip = useMotionTemplate`inset(${wipeTop}% 0 0 0)`;
  const lineTop = useMotionTemplate`${wipeTop}%`;

  // Slight scale-settle as the light arrives. (No blur here: a focus-pull
  // filter on a viewport-sized layer is a GPU tax the effect doesn't need.)
  const successScale = useTransform(scrollYProgress, S.scale, [1.05, 1], {
    ease: wipeEase,
  });

  // The horizon line — a bright warm sweep riding the reveal edge, present
  // only while the wipe is travelling.
  const lineOpacity = useTransform(scrollYProgress, S.line, [0, 1, 1, 0]);

  // Ambient glow warms from night-blue to sunrise-amber across the turn.
  const coolGlow = useTransform(scrollYProgress, S.cool, [1, 0.15]);
  const warmGlow = useTransform(scrollYProgress, S.warm, [0, 1]);

  // Narrative + artifact beats crossfade in lockstep with the wipe. The
  // pointer-events gates keep the hidden beat from swallowing clicks.
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

  return (
    <div ref={trackRef} className="relative lg:h-[260vh]">
      <div className="relative flex min-h-[100svh] items-center overflow-hidden lg:sticky lg:top-0">
        {/* ── Full-bleed backdrop: the world that turns ── */}
        <div className="absolute inset-0" aria-hidden={false}>
          {/* Base — the void. Stays put; the wipe simply uncovers the payoff. */}
          <Image
            src="/thevoid.png"
            alt={VOID_ALT}
            fill
            sizes="100vw"
            className="object-cover"
          />

          {/* The payoff, wiped in bottom-up across the whole stage. */}
          <motion.div
            className="absolute inset-0"
            style={{
              clipPath: successClip,
              WebkitClipPath: successClip,
              scale: successScale,
              willChange: "clip-path, transform",
            }}
          >
            <Image
              src="/thesuccess.png"
              alt={SUCCESS_ALT}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </motion.div>

          {/* Rising horizon of light — full-width, tracking the reveal edge. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-28 -translate-y-1/2"
            style={{
              top: lineTop,
              opacity: lineOpacity,
              background:
                "linear-gradient(to top, transparent, rgba(255,176,102,0.32) 42%, rgba(255,231,199,0.9) 50%, rgba(255,176,102,0.32) 58%, transparent)",
              filter: "blur(7px)",
              mixBlendMode: "screen",
              willChange: "top, opacity",
            }}
          />

          {/* Night-blue ambience — recedes as the dawn lands. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: coolGlow,
              background:
                "radial-gradient(ellipse 90% 70% at 70% 30%, rgba(1,145,252,0.14), transparent 65%)",
            }}
          />
          {/* Sunrise-amber ambience — blooms in with the payoff. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              opacity: warmGlow,
              background:
                "radial-gradient(ellipse 85% 65% at 68% 55%, rgba(255,168,74,0.16), transparent 62%)",
            }}
          />

          {/* Legibility + section grounding. */}
          <div aria-hidden className="absolute inset-0" style={{ background: TEXT_SCRIM }} />
          <div aria-hidden className="absolute inset-0" style={{ background: EDGE_SCRIM }} />
        </div>

        {/* ── Content: narrative left, artifact right ── */}
        <div className="relative mx-auto grid w-full max-w-content grid-cols-1 items-center gap-y-12 px-4 py-16 md:py-20 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-6">
            <CrossfadeStack
              problem={problem}
              payoff={payoff}
              problemStyle={{ opacity: problemOpacity, y: problemY, pointerEvents: problemPE }}
              payoffStyle={{ opacity: payoffOpacity, y: payoffY, pointerEvents: payoffPE }}
            />
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <CrossfadeStack
              problem={<GhostReceipt />}
              payoff={<AnswerReceipt />}
              problemStyle={{ opacity: problemOpacity, y: problemY, pointerEvents: problemPE }}
              payoffStyle={{ opacity: payoffOpacity, y: payoffY, pointerEvents: payoffPE }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Two beats sharing one grid cell, crossfaded by the scrub's motion values. */
function CrossfadeStack({
  problem,
  payoff,
  problemStyle,
  payoffStyle,
}: {
  problem: React.ReactNode;
  payoff: React.ReactNode;
  problemStyle: {
    opacity: MotionValue<number>;
    y: MotionValue<number>;
    pointerEvents: MotionValue<"auto" | "none">;
  };
  payoffStyle: {
    opacity: MotionValue<number>;
    y: MotionValue<number>;
    pointerEvents: MotionValue<"auto" | "none">;
  };
}) {
  return (
    <div className="grid items-center">
      <motion.div className="[grid-area:1/1]" style={problemStyle}>
        {problem}
      </motion.div>
      <motion.div className="[grid-area:1/1]" style={payoffStyle}>
        {payoff}
      </motion.div>
    </div>
  );
}
