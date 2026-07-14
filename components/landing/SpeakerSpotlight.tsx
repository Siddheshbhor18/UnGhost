"use client";

/**
 * SpeakerSpotlight — the landing's "guest sessions" beat.
 *
 * Replaces the Abhinav-Ranka FeaturedSpeaker card now that his session has
 * run. The pitch widened from one speaker to the programme itself ("talk to
 * the biggest names of the industry"), with the recorded session as the
 * proof: real operator, real room, real questions.
 *
 * Built on the platform's dark-glass + brand-blue chrome (PANEL_BG, hairline
 * gradient border, blue light wells) so it reads native beside the void
 * section and FeaturedSpeaker on /instructors.
 *
 * The video (public/abhinav-ranka-session.{mp4,webm}, ultrawide 2794×1228)
 * autoplays muted+looping ONLY while in view (IntersectionObserver) to spare
 * CPU/battery, and paints its poster instantly for LCP. Under
 * prefers-reduced-motion it never autoplays: the poster shows and native
 * controls let the user opt in.
 *
 * Section id `featured-speaker` is preserved: EnrollViaWhatsApp's share link
 * (#featured-speaker) scrolls here.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PharmEasyLogo, CoinDCXLogo } from "./FeaturedSpeaker";

const BLUE = "#0191FC";
const EASE = [0.22, 1, 0.36, 1] as const;

export function SpeakerSpotlight() {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play only while the frame is on screen; pause otherwise. Reduced-motion
  // users never get autoplay — the poster stays and `controls` let them opt in.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduce) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <div
      className="relative isolate overflow-hidden rounded-[28px] px-6 py-12 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.55)] sm:px-10 md:py-16 lg:px-16"
      style={{ background: "#000000" }}
    >
      {/* Hairline gradient border */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[28px]"
        style={{
          background: `linear-gradient(140deg, ${BLUE}66 0%, transparent 35%, transparent 65%, ${BLUE}3D 100%)`,
          padding: "1px",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {/* Blue light wells */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(70% 120% at 50% -8%, ${BLUE}2E, transparent 60%),
                       radial-gradient(60% 90% at 100% 100%, ${BLUE}18, transparent 65%)`,
        }}
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: "#6DB6F9", background: `${BLUE}1F`, border: `1px solid ${BLUE}40` }}
        >
          Guest sessions
        </span>

        <h2
          className="mt-6 font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-white text-balance sm:text-5xl lg:text-6xl"
          style={{ letterSpacing: "-0.02em" }}
        >
          Talk to the{" "}
          <span
            className="whitespace-nowrap"
            style={{
              color: "#6DB6F9",
              textShadow: "0 0 28px rgba(1,145,252,0.5), 0 0 10px rgba(1,145,252,0.4)",
            }}
          >
            biggest names
          </span>{" "}
          of the industry.
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-body-md leading-relaxed text-white/70 md:text-body-lg">
          We bring in the operators who actually built and scaled the companies
          you&apos;re aiming for. Live workshops, real questions in real time, no
          gatekeeping. Every session is announced in the community, so you&apos;re
          in the room when the next one runs.
        </p>

        {/* CTA — enroll now */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/signup?next=/bootcamps"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_30px_-8px_rgba(1,145,252,0.55)] transition-all duration-200 hover:bg-brand-600 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_36px_-10px_rgba(1,145,252,0.7)] active:scale-[0.98]"
          >
            Enroll now
          </Link>
        </div>
      </div>

      {/* ── The recorded session — cinematic ultrawide frame ── */}
      <motion.figure
        className="relative z-10 mx-auto mt-10 max-w-4xl"
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-white/12 shadow-[0_40px_100px_-32px_rgba(1,86,158,0.5)]">
          <video
            ref={videoRef}
            className="block aspect-[2794/1228] w-full object-cover"
            poster="/abhinav-ranka-session-poster.jpg"
            muted
            loop
            playsInline
            preload="metadata"
            controls={!!reduce}
            aria-label="Recorded live session: Abhinav Ranka presenting to attendees"
          >
            <source src="/abhinav-ranka-session.webm" type="video/webm" />
            <source src="/abhinav-ranka-session.mp4" type="video/mp4" />
          </video>

          {/* Past-session tag — honest: this recording is over, not live. */}
          <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80 backdrop-blur-sm ring-1 ring-white/15">
            Past session
          </span>
        </div>

        {/* Caption — who the session was with. */}
        <figcaption className="mt-5 flex flex-col items-center gap-2 text-center">
          <p className="text-body-md text-white/60">
            Session with{" "}
            <span className="font-semibold" style={{ color: "#6DB6F9" }}>Abhinav Ranka</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-white/80">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/45">
              ex-CFO
            </span>
            <PharmEasyLogo className="h-5 w-auto" />
            <span
              aria-hidden
              className="h-3.5 w-px"
              style={{ background: "rgba(255,255,255,0.15)" }}
            />
            <CoinDCXLogo className="h-2.5 w-auto" />
          </div>
        </figcaption>
      </motion.figure>

    </div>
  );
}
