"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

interface LiquidGlassProps {
  children: ReactNode;
  className?: string;
}

const BLOBS = [
  {
    size: 400,
    color: "rgba(1,145,252,0.20)",
    x: -20,
    y: -10,
    duration: 14,
    delay: 0,
  },
  {
    size: 320,
    color: "rgba(99,102,241,0.15)",
    x: 60,
    y: 40,
    duration: 18,
    delay: -4,
  },
  {
    size: 260,
    color: "rgba(6,182,212,0.12)",
    x: 30,
    y: -30,
    duration: 12,
    delay: -8,
  },
];

export function LiquidGlass({ children, className = "" }: LiquidGlassProps) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 overflow-hidden rounded-[28px]">
        {BLOBS.map((blob, i) => (
          <motion.div
            key={i}
            aria-hidden
            className="absolute rounded-full blur-3xl will-change-transform"
            style={{
              width: blob.size,
              height: blob.size,
              background: blob.color,
              left: `${blob.x}%`,
              top: `${blob.y}%`,
            }}
            animate={{
              x: [0, 30, -20, 10, 0],
              y: [0, -25, 15, -10, 0],
              scale: [1, 1.15, 0.95, 1.08, 1],
            }}
            transition={{
              duration: blob.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: blob.delay,
            }}
          />
        ))}
      </div>
      <div className="relative rounded-[28px] border border-white/60 bg-white/75 backdrop-blur-2xl shadow-elev-3 p-8 md:p-12">
        {children}
      </div>
    </div>
  );
}
