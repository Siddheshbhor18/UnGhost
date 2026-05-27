"use client";

/**
 * Necktie — brand-blue tie that slides down onto the ghost's chest during
 * the transformation. Tiny sway settle on landing.
 */

import { motion, useReducedMotion } from "framer-motion";

interface Props {
  show: boolean;
  delay?: number;
  width?: number;
}

export function Necktie({ show, delay = 0, width = 22 }: Props) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      style={{ width, height: width * 2.5 }}
      initial={{ y: -40, opacity: 0, rotate: 0 }}
      animate={
        show
          ? reduced
            ? { y: 0, opacity: 1, rotate: 0 }
            : { y: 0, opacity: 1, rotate: [0, -3, 3, -1, 0] }
          : { y: -40, opacity: 0, rotate: 0 }
      }
      transition={
        reduced
          ? { duration: 0.2 }
          : {
              delay,
              y: { type: "spring", damping: 14, stiffness: 240 },
              opacity: { delay, duration: 0.3 },
              rotate: { delay: delay + 0.4, duration: 0.6, ease: "easeOut" },
            }
      }
    >
      <svg
        viewBox="0 0 30 70"
        width="100%"
        height="100%"
        style={{ filter: "drop-shadow(0 2px 4px rgba(1,104,189,0.4))" }}
      >
        <defs>
          <linearGradient id="tie-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0191FC" />
            <stop offset="60%" stopColor="#017FE0" />
            <stop offset="100%" stopColor="#0168BD" />
          </linearGradient>
        </defs>

        {/* Knot */}
        <path
          d="M 12 4 L 18 4 L 20 12 L 15 16 L 10 12 Z"
          fill="url(#tie-body)"
          stroke="#003D75"
          strokeWidth="0.5"
        />

        {/* Body */}
        <path
          d="M 10 12 L 15 16 L 20 12 L 22 38 L 15 60 L 8 38 Z"
          fill="url(#tie-body)"
          stroke="#003D75"
          strokeWidth="0.5"
        />

        {/* Subtle highlight stripe down the middle */}
        <line
          x1="15"
          y1="18"
          x2="15"
          y2="56"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
        />

        {/* Faint diagonal pattern stripes */}
        <line x1="9" y1="24" x2="21" y2="20" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
        <line x1="9" y1="34" x2="21" y2="30" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
        <line x1="10" y1="44" x2="20" y2="40" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" />
      </svg>
    </motion.div>
  );
}
