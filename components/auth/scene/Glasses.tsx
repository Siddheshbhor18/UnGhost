"use client";

/**
 * Glasses — small office-style spectacles that slide in from sides during
 * the transformation. Settles over the ghost's eyes.
 */

import { motion, useReducedMotion } from "framer-motion";

interface Props {
  show: boolean;
  delay?: number;
  width?: number;
}

export function Glasses({ show, delay = 0, width = 60 }: Props) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      style={{ width, height: width * 0.4 }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={
        show
          ? reduced
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: [0.7, 1.12, 1] }
          : { opacity: 0, scale: 0.7 }
      }
      transition={
        reduced
          ? { duration: 0.2 }
          : {
              delay,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }
      }
    >
      <svg viewBox="0 0 60 24" width="100%" height="100%">
        {/* Left lens — black frames, transparent lens so eyes show through */}
        <motion.circle
          cx="14"
          cy="12"
          r="8"
          fill="rgba(10,10,10,0.18)"
          stroke="#0A0A0A"
          strokeWidth="2.4"
          initial={{ x: -40 }}
          animate={show ? { x: 0 } : { x: -40 }}
          transition={
            reduced
              ? { duration: 0.2 }
              : {
                  delay,
                  type: "spring",
                  damping: 18,
                  stiffness: 200,
                }
          }
        />

        {/* Right lens */}
        <motion.circle
          cx="46"
          cy="12"
          r="8"
          fill="rgba(10,10,10,0.18)"
          stroke="#0A0A0A"
          strokeWidth="2.4"
          initial={{ x: 40 }}
          animate={show ? { x: 0 } : { x: 40 }}
          transition={
            reduced
              ? { duration: 0.2 }
              : {
                  delay,
                  type: "spring",
                  damping: 18,
                  stiffness: 200,
                }
          }
        />

        {/* Bridge */}
        <line
          x1="22"
          y1="12"
          x2="38"
          y2="12"
          stroke="#0A0A0A"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        {/* Subtle top-edge shine on each lens */}
        <path
          d="M 9 8 Q 14 5 19 8"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M 41 8 Q 46 5 51 8"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}
