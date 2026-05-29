"use client";

/**
 * SlaLadder — the landing page's centerpiece. The SLA-or-slot-returned mechanic
 * rendered as a vertical countdown timeline: scrolling through it IS the
 * countdown. A scroll-linked fill line (transform: scaleY, never height)
 * draws down the rail as the section enters view. Reduced motion → the line
 * renders fully drawn and static; every numeral/label is real content and
 * readable with zero motion.
 */

import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useReducedMotion,
} from "framer-motion";

const NODES = [
  {
    hrs: "24h",
    label: "Priority",
    copy: "Fast-track roles. The recruiter answers within a day — or your application slot is returned, free of charge.",
    dot: "bg-error",
    text: "text-error",
  },
  {
    hrs: "48h",
    label: "Standard",
    copy: "The default commitment. Two business days, tracked against a public clock everyone can see.",
    dot: "bg-warning",
    text: "text-warning",
  },
  {
    hrs: "72h",
    label: "Extended",
    copy: "High-volume roles. A longer window, the same hard rule the moment the clock runs out.",
    dot: "bg-info",
    text: "text-info",
  },
] as const;

export function SlaLadder() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 75%", "end 65%"],
  });
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div ref={ref} className="relative">
      {/* Rail track — runs through the gutter behind the node dots */}
      <div
        aria-hidden
        className="absolute top-3 bottom-3 w-0.5 rounded-full bg-neutral-200"
        style={{ left: 19 }}
      />
      {/* Scroll-linked fill — scaleY transform only */}
      <motion.div
        aria-hidden
        className="absolute top-3 bottom-3 w-0.5 rounded-full bg-gradient-to-b from-error via-warning to-info"
        style={{
          left: 19,
          transformOrigin: "top",
          scaleY: reduce ? 1 : scaleY,
        }}
      />

      <div className="space-y-12 md:space-y-16">
        {NODES.map((n) => (
          <div key={n.hrs} className="relative flex gap-5 md:gap-8">
            <div className="relative shrink-0 w-10 flex justify-center">
              <span className="z-10 mt-1 grid place-items-center w-10 h-10 rounded-full bg-neutral-0 shadow-elev-2 ring-1 ring-neutral-200">
                <span className={`w-3 h-3 rounded-full ${n.dot}`} />
              </span>
            </div>
            <div className="pb-1">
              <div className="flex items-baseline gap-3">
                <span
                  className={`font-display font-extrabold text-display-lg tnum leading-none ${n.text}`}
                >
                  {n.hrs}
                </span>
                <span className="section-label">{n.label}</span>
              </div>
              <p className="text-body-md text-neutral-600 leading-relaxed mt-2 max-w-md">
                {n.copy}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
