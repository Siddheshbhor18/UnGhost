"use client";

/**
 * HeroCTAs — primary + secondary call-to-action with:
 *   - Magnetic hover (cursor-tracked translate + scale)
 *   - Continuous shine-sweep on primary
 *   - Glow ring on hover
 *   - Arrow icon jiggle on hover
 */

import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { useRef } from "react";

const SPRING = { stiffness: 240, damping: 22, mass: 0.5 };

function MagneticButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, SPRING);
  const y = useSpring(my, SPRING);

  if (reduce) return <div className={className}>{children}</div>;

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    mx.set(px * 12);
    my.set(py * 8);
  }
  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ x, y }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HeroCTAs() {
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {/* Primary — shine sweep + glow */}
      <MagneticButton>
        <Link href="/signup" className="hero-cta-primary inline-block">
          <button
            type="button"
            className="relative overflow-hidden inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white font-semibold text-base px-6 py-3.5 transition-all hover:bg-brand-600 active:scale-[0.98] group"
            style={{
              boxShadow: "0 10px 30px rgba(1,145,252,0.35)",
            }}
          >
            {/* Continuous shine sweep */}
            {!reduce && (
              <span
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
                  transform: "translateX(-100%)",
                  animation: "hero-shine 3.5s ease-in-out infinite",
                }}
              />
            )}
            <span className="relative">Find a job</span>
            <motion.span
              className="relative inline-flex"
              whileHover={reduce ? undefined : { x: 4 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
            >
              <ArrowRight size={16} />
            </motion.span>
          </button>
        </Link>
      </MagneticButton>

      {/* Secondary — magnetic only */}
      <MagneticButton>
        <Link href="/signup?role=recruiter">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-neutral-900 font-semibold text-base px-6 py-3.5 border border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 transition-all active:scale-[0.98]"
          >
            <Briefcase size={16} />
            Hire
          </button>
        </Link>
      </MagneticButton>
    </div>
  );
}
