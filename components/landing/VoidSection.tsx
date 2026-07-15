"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { JobMarquee, type TickerRole } from "@/components/landing/JobMarquee";

/**
 * The void — the landing's single dark beat: a lit stage where the problem
 * (you apply, nothing answers) sits in shadow and the turn (so we changed who
 * pays) emerges into a brand key-light.
 *
 * Design comes from real staging, not decoration:
 * - Off-black stage (neutral-950), never pure #000.
 * - Chiaroscuro: a shadow vignette weights the problem half; a directional
 *   brand key-light physically lights the answer half. No neon, no outer glow.
 * - "Then silence." arrives on a withheld beat (~0.75s) — the delay IS the
 *   silence. The answer + key-light bloom in together — the reply "arrives."
 * - A single vertical light beam divides the two acts (no arrow gimmick).
 * - The ghost mark looms low in the dark half; it never crosses into the light.
 * - `hiringCompanies` is real board data (Redis-cached upstream); a thin or
 *   failed read simply omits the marquee. No invented numbers, no fake logos.
 *
 * SSR ships the fully-visible final state; the hidden entrance pose is armed
 * only after mount on a visible tab (same pattern as LaneShowcase).
 * `prefers-reduced-motion` stays static.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Entrance beats (s) - one place to retime the whole sequence. */
const BEAT = {
  problem: 0,
  body: 0.45,
  silence: 0.75,
  light: 1.0,
  turn: 1.15,
  cta: 1.55,
} as const;

// Brand-300 (#6DB6F9) — the lightened brand token used on the near-black stage:
// brand-500 is too dark on #0A0A0A for AA-large text. The filled CTA still uses
// brand-500; this token is the dark-surface accent.
const ACCENT = "#6DB6F9";

const CTA_CLASS =
  "group inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_30px_-8px_rgba(1,145,252,0.55)] transition-all duration-200 hover:bg-brand-600 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_36px_-10px_rgba(1,145,252,0.7)] active:scale-[0.98]";

export function VoidSection({
  roles,
}: {
  roles: TickerRole[];
}) {
  const reduce = useReducedMotion();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!reduce && document.visibilityState === "visible") setArmed(true);
  }, [reduce]);

  return (
    <section
      id="void-section"
      className="relative overflow-hidden rounded-t-[32px] bg-neutral-950 text-white shadow-[0_-1px_0_rgba(255,255,255,0.06),0_0_120px_rgba(0,0,0,0.55)] md:rounded-t-[40px]"
      style={{ zIndex: 10 }}
    >
      <Stage key={armed ? "armed" : "static"} animate={armed} />
      <div className="relative pb-14 lg:pb-16">
        <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Roles on the clock right now
        </p>
        <JobMarquee roles={roles} />
      </div>
    </section>
  );
}

function Stage({ animate }: { animate: boolean }) {
  return (
    <>
      {/* Shadow vignette — deepens the problem (left) half. Chiaroscuro, not a
          decorative mesh. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 10% 42%, rgba(0,0,0,0.6) 0%, transparent 55%)",
        }}
      />

      {/* Brand key light — blooms in with the turn, lighting the answer (right)
          half. A soft directional wash, never an outer glow. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 95% at 86% -8%, rgba(1,145,252,0.22) 0%, rgba(1,145,252,0.07) 32%, transparent 60%)",
        }}
        initial={animate ? { opacity: 0.2 } : false}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1.5, ease: EASE, delay: BEAT.light }}
      />

      {/* The nothing, personified — looms low in the dark half only. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/symbol.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-[-2%] hidden w-[460px] rotate-[6deg] select-none opacity-[0.05] lg:block"
        style={{
          filter: "brightness(0) invert(1)",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 34%, black 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 34%, black 100%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pt-28 pb-12 md:pt-40 lg:min-h-[82vh] lg:pt-28 lg:pb-20">
        <div className="grid items-center gap-y-14 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-0">
          {/* ── Act 1 — the problem, in shadow ── */}
          <div className="text-center lg:pr-14 lg:text-left">
            <h2 className="font-display font-black text-balance text-5xl leading-[0.95] tracking-[-0.03em] text-white/55 lg:text-[4.25rem]">
              <motion.span
                className="block"
                initial={animate ? { opacity: 0, y: 16 } : false}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.6, ease: EASE, delay: BEAT.problem }}
              >
                You apply.
              </motion.span>
              {/* The withheld beat — the delay is the silence. */}
              <motion.span
                className="block text-white/45"
                initial={animate ? { opacity: 0 } : false}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 1.0, ease: "easeOut", delay: BEAT.silence }}
              >
                Then silence.
              </motion.span>
            </h2>
            <motion.p
              className="mx-auto mt-6 max-w-sm text-lg leading-relaxed text-white/60 lg:mx-0"
              initial={animate ? { opacity: 0, y: 10 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.7, ease: EASE, delay: BEAT.body }}
            >
              Sent, seen, ignored. On every other job board, nobody owes you a
              reply.
            </motion.p>
          </div>

          {/* ── Pivot — a vertical light beam dividing shadow from light ── */}
          <div aria-hidden className="hidden self-stretch lg:block lg:w-px">
            <motion.div
              className="mx-auto h-full w-px origin-center"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, rgba(109,182,249,0.5), transparent)",
              }}
              initial={animate ? { opacity: 0, scaleY: 0.4 } : false}
              whileInView={{ opacity: 1, scaleY: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, ease: EASE, delay: BEAT.light }}
            />
          </div>

          {/* ── Act 2 — the turn, in the light ── */}
          <motion.div
            className="text-center lg:pl-14 lg:text-left"
            initial={animate ? { opacity: 0, y: 18 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.8, ease: EASE, delay: BEAT.turn }}
          >
            <h2 className="font-display font-black text-balance text-5xl leading-[0.95] tracking-[-0.03em] text-white lg:text-[4.25rem]">
              So we changed{" "}
              <span className="whitespace-nowrap" style={{ color: ACCENT }}>
                who pays.
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-white/75 lg:mx-0">
              Now the recruiter is on the clock. Every application opens a public
              reply window. Miss it, and your credit comes straight back.
            </p>
            <div className="mt-9 flex justify-center lg:justify-start">
              <Link href="/signup?next=/student/jobs" className={CTA_CLASS}>
                Start applying free
                <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
