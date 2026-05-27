"use client";

/**
 * Confetti — physics-based particle burst for the auth ceremony.
 *
 * 30 pieces explode from a center point with random velocity, gravity, and
 * rotation. Pieces have 4 shape variations (square / circle / star / plus)
 * and a role-tinted color palette.
 *
 * Animations are pure transform + opacity for GPU acceleration. All pieces
 * mount when `play=true` and animate once; parent should unmount the
 * component after ~2.5s to free memory.
 */

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

export type ConfettiShape = "square" | "circle" | "star" | "plus";

interface Piece {
  id: number;
  size: number;
  color: string;
  shape: ConfettiShape;
  angle: number; // initial direction
  velocity: number;
  spin: number;
  duration: number;
}

const PALETTES: Record<string, string[]> = {
  student: ["#0191FC", "#FCD34D", "#A78BFA", "#0E9F6E", "#FFFFFF"],
  recruiter: ["#0191FC", "#0E9F6E", "#FCD34D", "#FFFFFF", "#017FE0"],
  instructor: ["#F59E0B", "#0E9F6E", "#A78BFA", "#FFFFFF", "#D97706"],
  admin: ["#0191FC", "#9CA3AF", "#1A1816", "#FFFFFF", "#FCD34D"],
  default: ["#0191FC", "#FCD34D", "#A78BFA", "#0E9F6E", "#FFFFFF"],
};

const SHAPES: ConfettiShape[] = ["square", "circle", "star", "plus"];

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

interface Props {
  play: boolean;
  count?: number;
  palette?: keyof typeof PALETTES;
}

export function Confetti({ play, count = 32, palette = "default" }: Props) {
  const reduced = useReducedMotion();

  const pieces = useMemo<Piece[]>(() => {
    const r = rng(42);
    const colors = PALETTES[palette] ?? PALETTES.default;
    return Array.from({ length: count }, (_, id) => ({
      id,
      size: 5 + r() * 6,
      color: colors[Math.floor(r() * colors.length)],
      shape: SHAPES[Math.floor(r() * SHAPES.length)],
      angle: r() * Math.PI * 2,
      velocity: 140 + r() * 220,
      spin: (r() - 0.5) * 720,
      duration: 1.6 + r() * 1.1,
    }));
  }, [count, palette]);

  if (!play || reduced) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-visible"
      style={{ zIndex: 5 }}
    >
      {pieces.map((p) => {
        const endX = Math.cos(p.angle) * p.velocity;
        const peakY = -Math.sin(p.angle) * p.velocity * 0.75;
        const finalY = -Math.sin(p.angle) * p.velocity * 0.2 + 300; // gravity pulls down
        return (
          <motion.div
            key={p.id}
            className="absolute left-1/2 top-1/2"
            style={{
              width: p.size,
              height: p.size,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
            }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0 }}
            animate={{
              x: [0, endX * 0.5, endX],
              y: [0, peakY, finalY],
              opacity: [0, 1, 1, 0],
              scale: [0.3, 1.1, 1, 0.9],
              rotate: [0, p.spin / 2, p.spin],
            }}
            transition={{
              duration: p.duration,
              times: [0, 0.15, 0.7, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Shape shape={p.shape} color={p.color} size={p.size} />
          </motion.div>
        );
      })}
    </div>
  );
}

function Shape({
  shape,
  color,
  size,
}: {
  shape: ConfettiShape;
  color: string;
  size: number;
}) {
  const glow = `0 0 ${size}px ${color}`;
  if (shape === "square") {
    return (
      <div
        className="w-full h-full"
        style={{
          background: color,
          borderRadius: 1,
          boxShadow: glow,
        }}
      />
    );
  }
  if (shape === "circle") {
    return (
      <div
        className="w-full h-full rounded-full"
        style={{
          background: color,
          boxShadow: glow,
        }}
      />
    );
  }
  if (shape === "star") {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path
          d="M 12 2 L 14.2 9.5 L 22 10 L 16 14.5 L 18 22 L 12 17.5 L 6 22 L 8 14.5 L 2 10 L 9.8 9.5 Z"
          fill={color}
          style={{ filter: `drop-shadow(0 0 ${size * 0.5}px ${color})` }}
        />
      </svg>
    );
  }
  // plus
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full">
      <path
        d="M 12 3 L 12 21 M 3 12 L 21 12"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 ${size * 0.5}px ${color})` }}
      />
    </svg>
  );
}
