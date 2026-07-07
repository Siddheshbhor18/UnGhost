"use client";

/**
 * Ghost — illustrated SVG character for the auth scene.
 *
 * Replaces the generic brand-gradient box + lucide icon. Real character:
 * round body with wavy bottom hem, blinking eyes, mouth that morphs with
 * phase, inner glow, soft drop-shadow. Phase-driven expressions:
 *
 *   idle        Eyes blink occasionally, soft smile, gentle bob
 *   typing      Eyes track left/right, slight head tilt
 *   submitting  Excited grin, eyes wide, faster bob
 *   success     Big smile, eyes squint with joy, sparkle in eyes
 *   error       Eyes wide open with concern, frown
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";

export type GhostPhase =
  | "idle"
  | "typing"
  | "submitting"
  | "success"
  | "error";

interface Props {
  phase?: GhostPhase;
  size?: number;
  className?: string;
}

export function Ghost({ phase = "idle", size = 120, className }: Props) {
  const reduced = useReducedMotion();
  const [blink, setBlink] = useState(false);

  // Random blink during idle
  useEffect(() => {
    if (reduced || phase !== "idle") return;
    let timeout: ReturnType<typeof setTimeout>;
    function scheduleNextBlink() {
      const delay = 2200 + Math.random() * 3200;
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        scheduleNextBlink();
      }, delay);
    }
    scheduleNextBlink();
    return () => clearTimeout(timeout);
  }, [reduced, phase]);

  // Eye dynamics
  const eyeOpenY = phase === "success" ? 1.5 : 2.5;
  const eyeHeight = blink || phase === "success" ? 0.5 : eyeOpenY * 2;
  const isError = phase === "error";

  return (
    <motion.div
      className={className}
      style={{ width: size, height: size, position: "relative" }}
    >
      {/* Soft glow halo */}
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: isError
            ? "radial-gradient(circle, rgba(220,38,38,0.4) 0%, transparent 65%)"
            : "radial-gradient(circle, rgba(1,145,252,0.40) 0%, transparent 65%)",
          filter: "blur(12px)",
        }}
        animate={
          reduced
            ? undefined
            : {
                scale: phase === "submitting" ? [1, 1.15, 1] : [1, 1.08, 1],
                opacity: isError ? [0.6, 1, 0.6] : [0.7, 1, 0.7],
              }
        }
        transition={
          reduced
            ? undefined
            : {
                duration: phase === "submitting" ? 0.8 : 3,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
      />

      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        className="relative"
        style={{ filter: "drop-shadow(0 8px 18px rgba(1,145,252,0.32))" }}
      >
        <defs>
          <linearGradient id="ghost-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#F5FAFF" />
            <stop offset="100%" stopColor="#D6EAFE" />
          </linearGradient>
          <radialGradient id="ghost-shine" cx="0.35" cy="0.3" r="0.5">
            <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* Ghost body — round top, wavy bottom */}
        <motion.path
          d="
            M 25 60
            C 25 35 40 22 60 22
            C 80 22 95 35 95 60
            L 95 88
            C 95 92 91 92 88 88
            C 85 84 81 84 78 88
            C 75 92 71 92 68 88
            C 65 84 61 84 58 88
            C 55 92 51 92 48 88
            C 45 84 41 84 38 88
            C 35 92 31 92 28 88
            L 25 88
            Z
          "
          fill="url(#ghost-body)"
          stroke="rgba(1,145,252,0.18)"
          strokeWidth="1.5"
          animate={
            reduced
              ? undefined
              : phase === "submitting"
                ? { scale: [1, 1.02, 1] }
                : { scale: 1 }
          }
          transition={
            reduced
              ? undefined
              : phase === "submitting"
                ? { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
                : undefined
          }
          style={{ transformOrigin: "60px 60px" }}
        />

        {/* Top-left highlight shine for round look */}
        <ellipse
          cx="42"
          cy="40"
          rx="14"
          ry="20"
          fill="url(#ghost-shine)"
          opacity="0.8"
        />

        {/* Cheek blush during success */}
        {phase === "success" && !reduced && (
          <>
            <motion.circle
              cx="38"
              cy="58"
              r="4"
              fill="rgba(255,128,140,0.5)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
            <motion.circle
              cx="82"
              cy="58"
              r="4"
              fill="rgba(255,128,140,0.5)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          </>
        )}

        {/* Eyes — blink/squint via a plain CSS scaleY transition. Framer-
            motion is deliberately NOT used on the eye/mouth parts: animating
            the raw `ry`/`d` attributes writes literal "undefined" frames
            (the sign-in glitch), and its SVG SSR drops passthrough props,
            causing hydration mismatches. Plain elements have neither problem. */}
        <ellipse
          cx="48"
          cy="52"
          rx="2.5"
          ry="5"
          fill={isError ? "#7F1D1D" : "#0A0A0A"}
          data-ghost-transform
          style={{
            transform: `scaleY(${eyeHeight / 5})`,
            transition: "transform 0.12s ease",
          }}
        />
        <ellipse
          cx="72"
          cy="52"
          rx="2.5"
          ry="5"
          fill={isError ? "#7F1D1D" : "#0A0A0A"}
          data-ghost-transform
          style={{
            transform: `scaleY(${eyeHeight / 5})`,
            transition: "transform 0.12s ease",
          }}
        />

        {/* Eye sparkles during success */}
        {phase === "success" && !reduced && (
          <>
            <motion.circle
              cx="49"
              cy="50"
              r="0.8"
              fill="#fff"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            />
            <motion.circle
              cx="73"
              cy="50"
              r="0.8"
              fill="#fff"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            />
          </>
        )}

        {/* Mouth — shape swaps per phase via keyed remount + CSS pop (see
            eye comment for why framer-motion is avoided on these parts). */}
        <path
          key={phase}
          d={getMouthPath(phase)}
          stroke={isError ? "#7F1D1D" : "#0A0A0A"}
          strokeWidth="1.8"
          strokeLinecap="round"
          fill={phase === "submitting" || phase === "success" ? "#0A0A0A" : "none"}
          data-ghost-transform
          className={reduced ? undefined : "ghost-mouth-pop"}
        />
      </svg>
    </motion.div>
  );
}

function getMouthPath(phase: GhostPhase): string {
  switch (phase) {
    case "submitting":
      // small "o" shape — anticipation
      return "M 56 67 Q 60 71 64 67 Q 60 71 56 67";
    case "success":
      // big smile
      return "M 50 64 Q 60 76 70 64";
    case "error":
      // frown
      return "M 50 70 Q 60 60 70 70";
    case "typing":
      // tiny smile, focused
      return "M 53 66 Q 60 70 67 66";
    case "idle":
    default:
      // soft default smile
      return "M 52 65 Q 60 70 68 65";
  }
}
