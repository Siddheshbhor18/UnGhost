"use client";

/**
 * AnswerReceipt — the void section's payoff artifact, the mirror of
 * <GhostReceipt />. Same card, same role, opposite ending: the reply window
 * is locked when the application lands, and the recruiter answers inside
 * it. Steps get BRIGHTER as the timeline advances (the ghost receipt's fade
 * runs the other way), and the final row is the one the ghost version never
 * gets. The footer names what happens on silence: the credit returns.
 *
 * Honest by construction: relative day markers, no invented company, and
 * the "22h early" figure is illustrative of the mechanic, not a statistic.
 * Reduced motion renders the finished state with no stagger.
 */

import { motion, useReducedMotion } from "framer-motion";
import {
  CheckCircle2,
  MessageCircle,
  Send,
  Timer,
  type LucideIcon,
} from "lucide-react";

interface Step {
  Icon: LucideIcon;
  label: string;
  day: string;
  /** Final resting opacity — brightening toward the reply. */
  bright: number;
  /** Warm accent for the row that pays the story off. */
  accent?: boolean;
}

const STEPS: Step[] = [
  { Icon: Send, label: "Application sent", day: "Day 0", bright: 0.62 },
  { Icon: Timer, label: "Reply window locked · 48h", day: "Day 0", bright: 0.82 },
  { Icon: MessageCircle, label: "Recruiter replied", day: "Day 1", bright: 1, accent: true },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function AnswerReceipt() {
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-2xl bg-white/[0.06] p-6 text-left ring-1 ring-white/[0.12] backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_24px_60px_-20px_rgba(0,0,0,0.65),0_10px_36px_-10px_rgba(1,145,252,0.22)]">
        <div className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-4">
          <p className="text-[15px] font-semibold text-white/90">
            Frontend Engineer
          </p>
          <p className="text-[12px] font-medium text-brand-300">via unGhost</p>
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
          {STEPS.map(({ Icon, label, day, bright, accent }) => (
            <motion.li
              key={label}
              className="flex items-center gap-3"
              style={reduce ? { opacity: bright } : undefined}
              variants={
                reduce
                  ? undefined
                  : {
                      hidden: { opacity: 0, y: 10 },
                      visible: {
                        opacity: bright,
                        y: 0,
                        transition: { duration: 0.5, ease: EASE },
                      },
                    }
              }
            >
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1 ${
                  accent
                    ? "bg-brand-500/20 ring-brand-400/40"
                    : "bg-white/[0.06] ring-white/10"
                }`}
              >
                <Icon
                  size={14}
                  className={accent ? "text-brand-300" : "text-white"}
                />
              </span>
              <span className="flex-1 text-[14px] text-white">{label}</span>
              <span className="tnum text-[12px] text-white/50">{day}</span>
            </motion.li>
          ))}

          {/* The row the ghost receipt never gets. */}
          <motion.li
            className="flex items-center gap-3"
            style={reduce ? { opacity: 1 } : undefined}
            variants={
              reduce
                ? undefined
                : {
                    hidden: { opacity: 0, y: 10 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.5, ease: EASE },
                    },
                  }
            }
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-400/15 ring-1 ring-emerald-300/30">
              <CheckCircle2 size={14} className="text-emerald-300" />
            </span>
            <span className="flex-1 text-[14px] font-medium text-white">
              Window met, 22h early
            </span>
            <span className="tnum text-[12px] text-emerald-300/80">on time</span>
          </motion.li>
        </motion.ul>
      </div>

      <p className="mt-4 text-center text-[12.5px] text-white/45">
        And if they had stayed silent? The credit comes back to you.
      </p>
    </div>
  );
}
