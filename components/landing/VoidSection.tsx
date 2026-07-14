"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { ScrollVelocityRow } from "@/components/ui/scroll-velocity-text";

/**
 * The void — the landing's dark narrative beat: the ghosted half (you apply,
 * nothing answers) against the lit half (so we changed who pays).
 *
 * Premium comes from staging, not props:
 * - "Then nothing." arrives on a withheld beat (~0.7s after "You apply.") —
 *   the delay IS the silence.
 * - The brand key light BLOOMS with the turn: the dark half never gets it,
 *   the answer side is physically lit.
 * - The ghost mascot looms at 5% opacity in the dark half — "the nothing",
 *   personified. It never crosses the divider.
 * - `hiringCompanies` is real board data (Redis-cached upstream); a thin or
 *   failed read simply omits the marquee. No invented numbers, no fake
 *   logos, ever.
 *
 * SSR ships the fully-visible final state; the hidden entrance pose is armed
 * only after mount on a visible tab (same robustness pattern as
 * LaneShowcase). `prefers-reduced-motion` stays static.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Entrance delays (s) — one place to retime the whole sequence. */
const BEAT = {
  problem: 0,
  silence: 0.7,
  problemBody: 0.4,
  connector: 1.0,
  turn: 1.15,
  cta: 1.55,
} as const;

const CTA_CLASS =
  "group inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_30px_-8px_rgba(1,145,252,0.55)] transition-all duration-200 hover:bg-brand-600 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_36px_-10px_rgba(1,145,252,0.7)] active:scale-[0.98]";

export function VoidSection({
  hiringCompanies,
}: {
  hiringCompanies: string[];
}) {
  const reduce = useReducedMotion();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!reduce && document.visibilityState === "visible") setArmed(true);
  }, [reduce]);

  return (
    <section
      id="void-section"
      className="relative overflow-hidden rounded-t-[32px] bg-black text-white shadow-[0_0_120px_rgba(0,0,0,0.6)] md:rounded-t-[40px]"
      style={{ zIndex: 10 }}
    >
      <Stage
        key={armed ? "armed" : "static"}
        animate={armed}
      />
      <CompanyMarquee names={hiringCompanies} reduce={!!reduce} />
    </section>
  );
}

function Stage({
  animate,
}: {
  animate: boolean;
}) {
  return (
    <>
      {/* ── Key light — blooms with the turn; the dark half stays dark ── */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 72% -12%, rgba(1,145,252,0.20) 0%, rgba(1,145,252,0.06) 34%, transparent 58%)",
        }}
        initial={animate ? { opacity: 0.25 } : false}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1.4, ease: EASE, delay: BEAT.turn }}
      />

      {/* ── The nothing, personified — looms in the dark half only ── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/symbol.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-28 left-[2%] hidden w-[440px] rotate-[5deg] select-none opacity-[0.04] lg:block"
        style={{
          filter: "brightness(0) invert(1)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 32%, black 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 32%, black 100%)",
        }}
      />

      {/* ── Stage floor — hairline the section rests on ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />

      <div className="relative mx-auto flex max-w-6xl items-center px-4 pt-32 pb-10 md:pt-44 lg:min-h-[70vh] lg:pt-24 lg:pb-16">
        <div className="relative grid w-full gap-y-10 lg:grid-cols-2">
          {/* Divider — gradient hairline, present only where the halves meet */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/15 to-transparent lg:block"
          />

          {/* ── Beat 1 — the problem, deliberately unlit ── */}
          <div className="text-center lg:pr-16 lg:text-left">
            <h2
              className="font-display font-black text-balance text-5xl lg:text-6xl leading-[0.98] text-white"
              style={{ letterSpacing: "-0.03em" }}
            >
              <motion.span
                className="inline-block"
                initial={animate ? { opacity: 0, y: 14 } : false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.6, ease: EASE, delay: BEAT.problem }}
              >
                You apply.
              </motion.span>{" "}
              {/* The withheld beat — the delay is the silence. */}
              <motion.span
                className="inline-block whitespace-nowrap text-white/40"
                initial={animate ? { opacity: 0 } : false}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.9, ease: "easeOut", delay: BEAT.silence }}
              >
                Then nothing.
              </motion.span>
            </h2>
            <motion.p
              className="mx-auto mt-5 max-w-md text-lg text-white/55 md:text-xl lg:mx-0"
              initial={animate ? { opacity: 0, y: 10 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.7, ease: EASE, delay: BEAT.problemBody }}
            >
              Sent, seen, then silence. On most job boards, no one owes you an
              answer.
            </motion.p>
          </div>

          {/* Causal connector — stacked flow (mobile) */}
          <motion.div
            className="flex justify-center lg:hidden"
            aria-hidden
            initial={animate ? { opacity: 0, scale: 0.6 } : false}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: EASE, delay: BEAT.connector }}
          >
            <span className="rounded-full bg-white/[0.04] p-3 ring-1 ring-white/15">
              <ArrowDown
                size={20}
                style={{
                  color: "#4db5ff",
                  filter: "drop-shadow(0 0 10px rgba(1,145,252,0.6))",
                }}
              />
            </span>
          </motion.div>

          {/* Causal connector — node on the rule (desktop). Positioning lives
              on a wrapper: framer owns the motion child's inline transform and
              would overwrite Tailwind's -translate-x/y classes (same pitfall
              CartBar documents). */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:flex"
            aria-hidden
          >
            <motion.span
              className="rounded-full bg-black p-3.5 ring-1 ring-white/15"
              initial={animate ? { opacity: 0, scale: 0.6 } : false}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.5, ease: EASE, delay: BEAT.connector }}
            >
              <ArrowRight
                size={22}
                style={{
                  color: "#4db5ff",
                  filter: "drop-shadow(0 0 10px rgba(1,145,252,0.6))",
                }}
              />
            </motion.span>
          </div>

          {/* Center CTA — over the divider, below the connector (desktop).
              Same wrapper split: outer positions, inner animates. */}
          <div
            className="absolute left-1/2 hidden -translate-x-1/2 lg:block"
            style={{ top: "calc(50% + 120px)" }}
          >
            <motion.div
              className="flex flex-col items-center gap-3"
              initial={animate ? { opacity: 0, y: 14 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.7, ease: EASE, delay: BEAT.cta }}
            >
              <Link href="/jobs" className={CTA_CLASS}>
                Browse live jobs
                <ArrowRight size={16} />
              </Link>
            </motion.div>
          </div>

          {/* ── Beat 2 — the turn, lit ── */}
          <motion.div
            className="text-center lg:pl-16 lg:text-left"
            initial={animate ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, ease: EASE, delay: BEAT.turn }}
          >
            <h2
              className="font-display font-black text-balance text-5xl lg:text-6xl leading-[0.98] text-white"
              style={{ letterSpacing: "-0.03em" }}
            >
              So we changed{" "}
              <span
                className="whitespace-nowrap"
                style={{
                  color: "#4db5ff",
                  textShadow:
                    "0 0 28px rgba(1,145,252,0.55), 0 0 10px rgba(1,145,252,0.45)",
                }}
              >
                who pays.
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-lg text-white/80 md:text-xl lg:mx-0">
              Now recruiters do. Every application opens a reply window. No
              answer in time, and your credit comes back.
            </p>
            <div className="mt-14 flex flex-col items-center gap-3 lg:hidden">
              <Link href="/jobs" className={CTA_CLASS}>
                Browse live jobs
                <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

/** Companies with live roles on the clock — the void's proof strip. Real
 *  board names only; fewer than four and the strip doesn't render (a marquee
 *  of two reads as emptiness, which is the opposite of the claim). The
 *  vendored row only *slows* under prefers-reduced-motion, so the static
 *  fallback lives here: first six names, no movement. */
function CompanyMarquee({
  names,
  reduce,
}: {
  names: string[];
  reduce: boolean;
}) {
  if (names.length < 4) return null;

  const Item = ({ name }: { name: string }) => (
    <span className="mx-7 inline-flex items-center gap-[3.5rem] font-display text-xl font-bold tracking-tight text-white/25 md:text-2xl">
      {name}
      <span aria-hidden className="h-1 w-1 rounded-full bg-brand-500/40" />
    </span>
  );

  return (
    <div
      className="relative pb-14 lg:pb-16"
      aria-label="Companies hiring on the clock right now"
    >
      <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
        Hiring on the clock right now
      </p>
      {reduce ? (
        <div className="flex flex-wrap items-center justify-center overflow-hidden px-6">
          {names.slice(0, 6).map((name) => (
            <Item key={name} name={name} />
          ))}
        </div>
      ) : (
        <div
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 14%, black 86%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 14%, black 86%, transparent)",
          }}
        >
          <ScrollVelocityRow baseVelocity={2}>
            {names.map((name) => (
              <Item key={name} name={name} />
            ))}
          </ScrollVelocityRow>
        </div>
      )}
    </div>
  );
}

