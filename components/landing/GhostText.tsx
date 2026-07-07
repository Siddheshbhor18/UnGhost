"use client";

/**
 * GhostText — display text whose letters progressively dissolve into the
 * background, left to right. Built for the void section's "Then nothing."
 * line: the sentence itself gets ghosted. Letters reveal on view with a
 * stagger, then rest at a per-letter opacity that decays toward near-zero,
 * so the line reads once and then visibly isn't there.
 *
 * Reduced motion renders the final dissolved state statically; screen
 * readers get the intact string via a visually-hidden twin.
 */

import { motion, useReducedMotion } from "framer-motion";

interface Props {
  text: string;
  className?: string;
  /** Seconds before the first letter appears (after in-view). */
  delay?: number;
  /** Resting opacity of the last (most-dissolved) letter. Higher = stays thicker. */
  floor?: number;
}

/** Resting opacity for letter i of n: legible start, near-invisible end. */
function restingOpacity(i: number, n: number, floor: number) {
  const t = n <= 1 ? 1 : i / (n - 1);
  return Math.max(floor, 0.92 * Math.pow(1 - t, 1.5) + 0.04);
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function GhostText({ text, className, delay = 0, floor = 0.05 }: Props) {
  const reduce = useReducedMotion();
  const letters = [...text];

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden>
        {letters.map((ch, i) => {
          const rest = restingOpacity(i, letters.length, floor);
          const glyph = ch === " " ? " " : ch;
          return reduce ? (
            <span key={i} style={{ opacity: rest }}>
              {glyph}
            </span>
          ) : (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: "0.35em" }}
              whileInView={{ opacity: rest, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{
                duration: 0.55,
                ease: EASE,
                delay: delay + i * 0.07,
              }}
            >
              {glyph}
            </motion.span>
          );
        })}
      </span>
    </span>
  );
}
