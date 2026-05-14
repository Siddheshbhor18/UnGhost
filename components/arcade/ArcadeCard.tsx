"use client";

import { cn } from "@/lib/utils/cn";
import { motion, type HTMLMotionProps } from "framer-motion";

interface Props extends HTMLMotionProps<"div"> {
  glow?: "pink" | "green" | "blue" | "yellow" | "red" | "purple" | "none";
  interactive?: boolean;
  children: React.ReactNode;
}

const glowMap: Record<NonNullable<Props["glow"]>, string> = {
  pink: "hover:shadow-pixel-neon-pink hover:border-neon-pink",
  green: "hover:shadow-pixel-neon-green hover:border-neon-green",
  blue: "hover:shadow-pixel-neon-blue hover:border-neon-blue",
  yellow: "hover:border-neon-yellow",
  red: "hover:border-neon-red",
  purple: "hover:border-neon-purple",
  none: "",
};

export function ArcadeCard({
  glow = "none",
  interactive = false,
  className,
  children,
  ...rest
}: Props) {
  return (
    <motion.div
      whileHover={interactive ? { y: -2, x: -2 } : undefined}
      transition={{ duration: 0.06 }}
      className={cn(
        "pixel-card p-5 transition-all duration-100",
        glowMap[glow],
        interactive && "cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
