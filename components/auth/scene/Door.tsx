"use client";

/**
 * Door — illustrated door with proper 3D panel swing.
 *
 * Structure:
 *   • SVG layer = static frame, hinges, doorway interior, light beam, floor shadow
 *   • Div overlay = the panel itself, positioned absolutely, rotates with real
 *     CSS 3D transform on a perspective parent (SVG `<g>` 3D rotation doesn't
 *     actually render with depth — needs to be HTML div for real 3D feel).
 *
 * Phases:
 *   closed     panel flush (rotateY: 0)
 *   ajar       cracked ~12° open (rotateY: -12)
 *   open       swung wide (rotateY: -75, less extreme than full edge-on so
 *              the panel face stays visible)
 */

import { motion, useReducedMotion, type Variants } from "framer-motion";

export type DoorPhase = "closed" | "ajar" | "open";

interface Props {
  phase?: DoorPhase;
  width?: number;
  className?: string;
}

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const panelVariants: Variants = {
  closed: { rotateY: 0 },
  ajar: {
    rotateY: -12,
    transition: { duration: 0.35, ease: EASE_OUT },
  },
  open: {
    rotateY: -75,
    transition: { type: "spring", stiffness: 60, damping: 14, mass: 1 },
  },
};

export function Door({ phase = "closed", width = 220, className }: Props) {
  const reduced = useReducedMotion();
  const height = width * 1.4;

  // SVG viewBox-relative measurements
  const VBW = 200;
  const VBH = 280;
  // Panel rect inside viewBox: x=34, y=60, w=132, h=210
  // Translate to pixel measurements for the div overlay
  const px = (val: number) => (val / VBW) * width;
  const py = (val: number) => (val / VBH) * height;

  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: "relative",
        perspective: 1200,
        perspectiveOrigin: "30% 50%",
      }}
    >
      {/* Static layer — frame, hinges, doorway interior, light beam */}
      <svg
        viewBox="0 0 200 280"
        width={width}
        height={height}
        className="absolute inset-0 overflow-visible"
      >
        <defs>
          <linearGradient id="door-frame" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0168BD" />
            <stop offset="50%" stopColor="#0191FC" />
            <stop offset="100%" stopColor="#0168BD" />
          </linearGradient>
          <radialGradient id="door-inner" cx="0.5" cy="0.4" r="0.7">
            <stop offset="0%" stopColor="#FFF8E1" />
            <stop offset="60%" stopColor="#FFE4A4" />
            <stop offset="100%" stopColor="#F59E0B" />
          </radialGradient>
          <radialGradient id="floor-shadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(10,10,10,0.35)" />
            <stop offset="100%" stopColor="rgba(10,10,10,0)" />
          </radialGradient>
        </defs>

        {/* Floor shadow under door */}
        <ellipse cx="100" cy="270" rx="80" ry="6" fill="url(#floor-shadow)" />

        {/* Decorative arch above door */}
        <path
          d="M 18 50 Q 100 8 182 50"
          fill="none"
          stroke="url(#door-frame)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Outer frame */}
        <path
          d="M 18 270 L 18 55 Q 18 18 100 18 Q 182 18 182 55 L 182 270"
          fill="none"
          stroke="url(#door-frame)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Inner frame trim */}
        <path
          d="M 28 270 L 28 60 Q 28 28 100 28 Q 172 28 172 60 L 172 270"
          fill="none"
          stroke="rgba(1,145,252,0.35)"
          strokeWidth="1.5"
        />

        {/* DOORWAY INTERIOR — warm light visible when open */}
        <motion.rect
          x="34"
          y="60"
          width="132"
          height="210"
          rx="6"
          fill="url(#door-inner)"
          initial={{ opacity: 0 }}
          animate={{
            opacity:
              phase === "closed" ? 0 : phase === "ajar" ? 0.4 : 0.95,
          }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        />

        {/* Light beam emanating from doorway */}
        <motion.path
          d="M 100 50 L 30 270 L 170 270 Z"
          fill="url(#door-inner)"
          opacity="0.5"
          initial={{ opacity: 0, scaleX: 0.1 }}
          animate={
            reduced
              ? { opacity: phase === "closed" ? 0 : 0.5, scaleX: 1 }
              : phase === "closed"
                ? { opacity: 0, scaleX: 0.1 }
                : phase === "ajar"
                  ? { opacity: 0.45, scaleX: 0.4 }
                  : { opacity: 0.9, scaleX: 1.05 }
          }
          transition={{ duration: 0.8, ease: EASE_OUT }}
          style={{
            transformOrigin: "100px 50px",
            filter: "blur(2px)",
          }}
        />

        {/* Hinges on left edge of frame */}
        <rect x="32" y="80" width="6" height="14" rx="1" fill="#0168BD" />
        <rect x="32" y="240" width="6" height="14" rx="1" fill="#0168BD" />
      </svg>

      {/* PANEL — separate HTML div with real 3D perspective rotation */}
      <motion.div
        variants={reduced ? undefined : panelVariants}
        initial="closed"
        animate={phase}
        style={{
          position: "absolute",
          left: px(34),
          top: py(60),
          width: px(132),
          height: py(210),
          transformOrigin: "left center",
          transformStyle: "preserve-3d",
          backfaceVisibility: "hidden",
          borderRadius: 6,
          background:
            "linear-gradient(135deg, #E8F4FE 0%, #C5E2FD 50%, #9DCEFB 100%)",
          border: "2px solid #0168BD",
          boxShadow:
            phase === "open"
              ? "0 8px 24px rgba(1,104,189,0.4), 0 4px 12px rgba(0,0,0,0.15)"
              : "0 2px 6px rgba(0,0,0,0.08)",
          willChange: "transform",
        }}
      >
        {/* Top recessed panel */}
        <div
          style={{
            position: "absolute",
            left: "12%",
            top: "8%",
            width: "76%",
            height: "38%",
            borderRadius: 4,
            border: "1.5px solid rgba(1,104,189,0.5)",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(1,145,252,0.05))",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "8%",
              borderRadius: 3,
              border: "0.8px solid rgba(1,145,252,0.25)",
            }}
          />
        </div>

        {/* Bottom recessed panel */}
        <div
          style={{
            position: "absolute",
            left: "12%",
            top: "52%",
            width: "76%",
            height: "38%",
            borderRadius: 4,
            border: "1.5px solid rgba(1,104,189,0.5)",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(1,145,252,0.05))",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "8%",
              borderRadius: 3,
              border: "0.8px solid rgba(1,145,252,0.25)",
            }}
          />
        </div>

        {/* Brass knob */}
        <div
          style={{
            position: "absolute",
            right: "8%",
            top: "50%",
            transform: "translateY(-50%)",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 30%, #FEF3C7 0%, #D97706 55%, #78350F 100%)",
            border: "0.5px solid #78350F",
            boxShadow: "0 2px 3px rgba(0,0,0,0.3), inset 0 1px 1px rgba(254,243,199,0.6)",
          }}
        />
      </motion.div>
    </div>
  );
}
