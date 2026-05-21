"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

/**
 * PasswordStrengthRing — circular SVG that fills as password strength
 * increases. Replaces the old horizontal 4-bar meter from /signup.
 *
 * Strength scoring matches `passwordStrength()` previously used inline in
 * signup — kept here so the ring + form-disable logic share one source of
 * truth.
 */
export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface StrengthScore {
  level: StrengthLevel;
  label: string;
  color: string; // hex
  pct: number; // 0-100
}

export function scorePassword(p: string): StrengthScore {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  const map: Record<StrengthLevel, Omit<StrengthScore, "level">> = {
    0: { label: "Too short", color: "#F43F5E", pct: 0 },
    1: { label: "Weak", color: "#F43F5E", pct: 25 },
    2: { label: "Okay", color: "#F59E0B", pct: 50 },
    3: { label: "Good", color: "#0191FC", pct: 75 },
    4: { label: "Strong", color: "#10B981", pct: 100 },
  };
  const level = s as StrengthLevel;
  return { level, ...map[level] };
}

interface Props {
  value: string;
  size?: number;
}

/**
 * Renders a single-stroke SVG arc that animates between strength levels.
 * Stroke dash-offset trick: the ring is a full circle, we just move where
 * the dash starts so it appears to "fill in" smoothly.
 */
export function PasswordStrengthRing({ value, size = 28 }: Props) {
  const reduced = useReducedMotion();
  const score = useMemo(() => scorePassword(value), [value]);
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score.pct / 100);

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      aria-label={`Password strength: ${score.label}`}
      role="img"
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E5E7"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={score.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{
            strokeDashoffset: offset,
            stroke: score.color,
          }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
          }
        />
      </svg>
      {/* dot in centre echoes the colour so a small ring is still legible */}
      <span
        className="absolute w-1.5 h-1.5 rounded-full transition-colors"
        style={{ backgroundColor: score.color }}
        aria-hidden="true"
      />
    </div>
  );
}
