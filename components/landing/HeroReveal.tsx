"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef } from "react";

export function HeroReveal({
  children,
  overlaySelector,
}: {
  children: React.ReactNode;
  overlaySelector: string;
}) {
  const stickyRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: stickyRef,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.965]);
  const blur = useTransform(scrollYProgress, [0, 1], [0, 3]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0, 0.28]);

  if (reduce) {
    return <>{children}</>;
  }

  return (
    <div ref={stickyRef} className="sticky top-0 z-0">
      <motion.div style={{ scale, filter: blur ? `blur(${blur}px)` : "blur(0px)", willChange: "transform, filter" }}>
        {children}
      </motion.div>
      <motion.div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-neutral-950"
        style={{ opacity: overlayOpacity }}
      />
    </div>
  );
}
