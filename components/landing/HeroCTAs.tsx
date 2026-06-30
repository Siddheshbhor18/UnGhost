"use client";

/**
 * HeroCTAs — glass-premium hero buttons.
 *
 * Primary  = brand-fill with luminous brand shadow + inset highlight (the
 *            "lit-from-within" feel that pure flat colour can't give).
 * Secondary = frosted-glass white pill that complements the primary without
 *             competing with it. Both rest on a subtle scale-down press tell
 *             and a hover arrow translate — no magnetic gimmick, no shine
 *             sweep. Reduced-motion users keep all functionality, lose only
 *             the arrow translate.
 */

import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

export function HeroCTAs() {
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      <Link
        href="/signup?next=/student/jobs"
        className="group inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white font-semibold text-base px-7 h-12 shadow-[0_10px_28px_rgba(1,145,252,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] hover:bg-brand-600 hover:shadow-[0_12px_32px_rgba(1,145,252,0.42),inset_0_1px_0_rgba(255,255,255,0.22)] transition-shadow duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]"
      >
        Browse jobs
        <motion.span
          className="inline-flex"
          whileHover={reduce ? undefined : { x: 3 }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
        >
          <ArrowRight size={16} />
        </motion.span>
      </Link>

      <Link
        href="/signup?next=/bootcamps"
        className="inline-flex items-center gap-2 rounded-xl bg-white/70 backdrop-blur-xl text-neutral-900 font-semibold text-base px-7 h-12 border border-white/70 shadow-[0_4px_16px_rgba(10,10,10,0.04)] hover:bg-white/90 hover:border-white/90 transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]"
      >
        <GraduationCap size={16} />
        Start learning
      </Link>
    </div>
  );
}
