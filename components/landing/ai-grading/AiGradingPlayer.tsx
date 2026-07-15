"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

const PANEL =
  "overflow-hidden rounded-3xl border border-neutral-200/70 bg-white shadow-[0_32px_80px_-40px_rgba(1,86,158,0.28)]";

const ALT =
  "AI grading demo: a scenario answer scanned and scored against Depth, Evidence, and Trade-offs, then the score and notes shared with the recruiter.";

/**
 * AiGradingPlayer — the AI-grading pass as a pre-rendered looping video.
 *
 * The composition is rendered to /public/ai-grading.mp4 by the Remotion CLI
 * (see remotion/Root.tsx). Embedding a plain <video> keeps the page fast: the
 * poster paints instantly, the small mp4 streams in, and no Remotion Player
 * runtime ships to the browser. Reduced motion shows the poster still; the
 * video only plays while on screen.
 */
export function AiGradingPlayer() {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduce) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduce]);

  if (reduce) {
    return (
      <div className={PANEL}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/ai-grading-poster.png" alt={ALT} className="block w-full" />
      </div>
    );
  }

  return (
    <div className={PANEL}>
      <video
        ref={videoRef}
        className="block w-full"
        poster="/ai-grading-poster.png"
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={ALT}
      >
        <source src="/ai-grading.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
