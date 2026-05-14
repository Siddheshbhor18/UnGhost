"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

interface Props {
  value: number;
  suffix?: string;
  durationMs?: number;
  color?: "pink" | "green" | "blue" | "yellow";
  className?: string;
}

const colorMap = {
  pink: "text-neon-pink",
  green: "text-neon-green",
  blue: "text-neon-blue",
  yellow: "text-neon-yellow",
};

export function ScoreCounter({
  value,
  suffix = "",
  durationMs = 900,
  color = "green",
  className = "",
}: Props) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(mv, value, { duration: durationMs / 1000, ease: "easeOut" });
    return () => controls.stop();
  }, [value, durationMs, mv]);

  return (
    <span className={`font-pixel neon-text ${colorMap[color]} ${className}`}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
