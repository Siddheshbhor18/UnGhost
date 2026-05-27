"use client";

/**
 * Briefcase — SVG accessory that materializes during the auth ceremony
 * transformation sequence. Rises from below with a spring overshoot.
 *
 * Has a slot in the lower-right corner for a tiny role badge sticker
 * (rendered as children).
 */

import { motion, useReducedMotion } from "framer-motion";

interface Props {
  show: boolean;
  delay?: number;
  size?: number;
  children?: React.ReactNode; // role badge slot
}

export function Briefcase({ show, delay = 0, size = 56, children }: Props) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      style={{ width: size, height: size * 0.75, position: "relative" }}
      initial={{ y: 80, scale: 0.5, opacity: 0, rotate: -8 }}
      animate={
        show
          ? reduced
            ? { y: 0, scale: 1, opacity: 1, rotate: 0 }
            : {
                y: 0,
                scale: 1,
                opacity: 1,
                rotate: 0,
              }
          : { y: 80, scale: 0.5, opacity: 0, rotate: -8 }
      }
      transition={
        reduced
          ? { duration: 0.2 }
          : {
              delay,
              type: "spring",
              damping: 13,
              stiffness: 240,
              mass: 0.8,
            }
      }
    >
      <svg viewBox="0 0 80 60" width="100%" height="100%">
        <defs>
          <linearGradient id="case-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#92400E" />
            <stop offset="50%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>
          <linearGradient id="case-clasp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="50%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
        </defs>

        {/* Handle */}
        <path
          d="M 30 12 Q 30 4 40 4 Q 50 4 50 12"
          fill="none"
          stroke="#451A03"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Body */}
        <rect
          x="8"
          y="14"
          width="64"
          height="42"
          rx="4"
          fill="url(#case-body)"
          stroke="#451A03"
          strokeWidth="1.5"
        />

        {/* Top edge highlight */}
        <line x1="10" y1="16" x2="70" y2="16" stroke="rgba(254,243,199,0.4)" strokeWidth="1" />

        {/* Center seam */}
        <line x1="8" y1="32" x2="72" y2="32" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />

        {/* Clasp / lock */}
        <rect
          x="36"
          y="28"
          width="8"
          height="8"
          rx="1"
          fill="url(#case-clasp)"
          stroke="#451A03"
          strokeWidth="0.5"
        />
        <circle cx="40" cy="32" r="1.2" fill="#451A03" />

        {/* Stitching dots */}
        <circle cx="14" cy="22" r="0.8" fill="rgba(254,243,199,0.5)" />
        <circle cx="66" cy="22" r="0.8" fill="rgba(254,243,199,0.5)" />
        <circle cx="14" cy="50" r="0.8" fill="rgba(254,243,199,0.5)" />
        <circle cx="66" cy="50" r="0.8" fill="rgba(254,243,199,0.5)" />
      </svg>

      {/* Role badge slot — positioned in lower-right corner of case */}
      {children ? (
        <div
          style={{
            position: "absolute",
            right: -size * 0.1,
            bottom: -size * 0.05,
          }}
        >
          {children}
        </div>
      ) : null}
    </motion.div>
  );
}
