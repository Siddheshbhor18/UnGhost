"use client";

/**
 * GhostReceipt — the void section's pain artifact.
 *
 * A typical job-board application rendered as a timeline that fades into
 * the dark: sent → viewed → follow-up → silence. Each step rests dimmer
 * than the last and the final row never arrives, so the section *shows*
 * the ghosting its headline names instead of describing it. The pivot
 * line below ("we changed who pays for the silence") lands on this
 * evidence.
 *
 * Honest by construction: relative day markers, no invented company or
 * stat. Reduced motion renders the finished state with no stagger and no
 * caret blink.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Eye, MessageCircle, Send, type LucideIcon } from "lucide-react";

interface Step {
  Icon: LucideIcon;
  label: string;
  day: string;
  /** Final resting opacity — the fade into the void. */
  dim: number;
}

const STEPS: Step[] = [
  { Icon: Send, label: "Application sent", day: "Day 0", dim: 1 },
  { Icon: Eye, label: "Viewed by employer", day: "Day 2", dim: 0.6 },
  { Icon: MessageCircle, label: "You follow up", day: "Day 9", dim: 0.34 },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function GhostReceipt() {
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-sm">
      <motion.div
        className="rounded-2xl bg-white/[0.05] p-6 text-left ring-1 ring-white/[0.08] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_24px_60px_-20px_rgba(0,0,0,0.65),0_10px_30px_-10px_rgba(1,145,252,0.14)]"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-4">
          <p className="text-[15px] font-semibold text-white/90">
            Frontend Engineer
          </p>
          <p className="text-[12px] text-white/40">via a typical job board</p>
        </div>

        <motion.ul
          className="mt-5 space-y-5"
          initial={reduce ? undefined : "hidden"}
          whileInView={reduce ? undefined : "visible"}
          viewport={{ once: true, amount: 0.5 }}
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.45, delayChildren: 0.35 },
            },
          }}
        >
          {STEPS.map(({ Icon, label, day, dim }) => (
            <motion.li
              key={label}
              className="flex items-center gap-3"
              style={reduce ? { opacity: dim } : undefined}
              variants={
                reduce
                  ? undefined
                  : {
                      hidden: { opacity: 0, y: 10 },
                      visible: {
                        opacity: dim,
                        y: 0,
                        transition: { duration: 0.5, ease: EASE },
                      },
                    }
              }
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] ring-1 ring-white/10">
                <Icon size={14} className="text-white" />
              </span>
              <span className="flex-1 text-[14px] text-white">{label}</span>
              <span className="tnum text-[12px] text-white/50">{day}</span>
            </motion.li>
          ))}

          {/* The row that never arrives — a waiting caret where the reply
              icon should be. Dimmest of all; the silence is the point. */}
          <motion.li
            className="flex items-center gap-3"
            style={reduce ? { opacity: 0.35 } : undefined}
            variants={
              reduce
                ? undefined
                : {
                    hidden: { opacity: 0, y: 10 },
                    visible: {
                      opacity: 0.35,
                      y: 0,
                      transition: { duration: 0.5, ease: EASE },
                    },
                  }
            }
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-dashed border-white/25">
              <span
                className={`h-3.5 w-[2px] bg-white/70 ${reduce ? "" : "animate-pulse"}`}
              />
            </span>
            <span className="flex-1 text-[14px] italic text-white">
              Still waiting
            </span>
            <span className="tnum text-[12px] text-white/50">Day 41</span>
          </motion.li>
        </motion.ul>
      </motion.div>

      <p className="mt-4 text-center text-[12.5px] text-white/40">
        Most applications end like this. Nobody owes you an answer.
      </p>
    </div>
  );
}
