"use client";

/**
 * ScrollPrompt — subtle bouncing arrow + label at the bottom of the hero.
 * Tells the visitor there's more below. Fades out after the user scrolls.
 */

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";

export function ScrollPrompt() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 200], [1, 0]);

  return (
    <motion.div
      style={reduce ? undefined : { opacity }}
      className="flex flex-col items-center gap-2 pt-10 pb-2"
    >
      <span className="text-[11px] uppercase tracking-widest font-semibold text-neutral-400">
        See how it works
      </span>
      <motion.div
        animate={
          reduce
            ? undefined
            : {
                y: [0, 6, 0],
              }
        }
        transition={
          reduce
            ? undefined
            : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
        }
        className="grid place-items-center w-7 h-7 rounded-full border border-neutral-300 text-neutral-500"
      >
        <ChevronDown size={14} />
      </motion.div>
    </motion.div>
  );
}
