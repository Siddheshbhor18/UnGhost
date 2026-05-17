"use client";

import { cn } from "@/shared/lib/cn";
import { motion, type HTMLMotionProps } from "framer-motion";
import { forwardRef } from "react";

type Variant = "pink" | "green" | "blue" | "yellow" | "ghost" | "red";
type Size = "sm" | "md" | "lg";

interface Props extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  children: React.ReactNode;
  block?: boolean;
}

const variantClass: Record<Variant, string> = {
  pink: "bg-neon-pink text-black border-black",
  green: "bg-neon-green text-black border-black",
  blue: "bg-neon-blue text-black border-black",
  yellow: "bg-neon-yellow text-black border-black",
  red: "bg-neon-red text-white border-black",
  ghost: "bg-transparent text-neon-blue border-neon-blue",
};

const sizeClass: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[10px]",
  md: "px-5 py-3 text-xs",
  lg: "px-8 py-4 text-sm",
};

export const PixelButton = forwardRef<HTMLButtonElement, Props>(function PixelButton(
  { variant = "pink", size = "md", className, children, block, disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileHover={disabled ? undefined : { x: -2, y: -2 }}
      whileTap={disabled ? undefined : { x: 2, y: 2 }}
      transition={{ type: "tween", duration: 0.05 }}
      className={cn(
        "btn-pixel relative inline-flex items-center justify-center gap-2 border-2 font-pixel uppercase tracking-wider shadow-pixel transition-shadow",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        variantClass[variant],
        sizeClass[size],
        block && "w-full",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
