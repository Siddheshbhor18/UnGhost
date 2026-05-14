"use client";

import { motion } from "framer-motion";

interface Props {
  active: boolean;
  color?: "blue" | "green" | "pink";
}

const colorMap = {
  blue: "var(--neon-blue)",
  green: "var(--neon-green)",
  pink: "var(--neon-pink)",
};

export function LaserScan({ active, color = "blue" }: Props) {
  if (!active) return null;
  const c = colorMap[color];
  return (
    <motion.div
      className="pointer-events-none absolute inset-y-0 w-[2px]"
      style={{
        boxShadow: `0 0 24px 4px ${c}, 0 0 60px 10px ${c}`,
        background: c,
      }}
      initial={{ left: "-2%", opacity: 0 }}
      animate={{ left: "102%", opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.2 }}
    />
  );
}
