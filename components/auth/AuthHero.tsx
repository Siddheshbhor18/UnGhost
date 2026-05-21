"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Ghost, Sparkles } from "lucide-react";
import {
  autoMood,
  moodCopy,
  type Mood,
} from "@/components/glass/DoorAnimation";
import type { Role } from "./RolePicker";

/**
 * AuthHero — desktop-only animated illustration on the right side of the
 * sign-in / sign-up pages.
 *
 * Choreography is driven by `phase`:
 *
 *   idle        Default. Ghost bobs in front of a closed door. Sparkles drift.
 *               Greeting + tagline rotator render at top.
 *
 *   submitting  Brief intermediate state (~0.3 s). Door cracks ~5° open, a
 *               narrow light beam emerges, sparkles intensify. The ghost
 *               leans toward the doorway. This is the "auth in flight"
 *               beat — server hasn't replied yet.
 *
 *   entering    Door swings fully open (rotateY ≈ 90°), halo brightens, the
 *               ghost glides into the doorway (scales up + slides in + fades
 *               at the end). After ~0.6 s the parent triggers the full-screen
 *               DoorAnimation overlay — this hero serves as the bridge.
 *
 * Mobile (< lg) hides the hero entirely.
 */
export type AuthHeroPhase = "idle" | "submitting" | "entering";

interface Props {
  role: Role;
  mode: "signin" | "signup";
  phase?: AuthHeroPhase;
}

const EASE_OUT_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

/**
 * Role-specific tagline rotation. Each pool cycles in order every ROTATE_MS.
 * Pools are short on purpose — we want the cadence to feel intentional,
 * not random.
 */
const TAGLINE_POOLS: Record<Role, string[]> = {
  student: [
    "Find roles that don't ghost.",
    "Apply once. Hear back. Always.",
    "Skill verified, not just claimed.",
  ],
  recruiter: [
    "Hire without the noise.",
    "AI-graded fit. Real signal.",
    "SLA-bound. Reputation built in.",
  ],
  instructor: [
    "Teach. Verify. Refer.",
    "Your students, hired faster.",
    "Top-10 cohort gets featured.",
  ],
  admin: [
    "Run the platform.",
    "Every ghost, tracked.",
    "Refunds enforce promises.",
  ],
};

/**
 * Mood-aware sub-greetings, layered ON TOP of the standard moodCopy()
 * greeting. Idea: greeting sets the time-of-day, this sets the emotional
 * temperature.
 */
const SUB_GREETINGS: Record<Mood, string[]> = {
  morning: ["Fresh start.", "Caffeine optional."],
  afternoon: ["Mid-session focus.", "Lunch later. Hire first."],
  evening: ["Winding down? We'll be quick.", "Twilight, not goodnight."],
  late_night: ["We see you, night-owl.", "Bold to ship at this hour."],
  friday: ["Ghost-free weekend incoming.", "End the week clean."],
  long_absence: ["Welcome back. Missed you.", "Pick up where you left off."],
  default: ["Glad you're here.", "Let's get to work."],
};

const ROTATE_MS = 5400;

export function AuthHero({ role, mode, phase = "idle" }: Props) {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Time-of-day mood, computed client-side only (server has no idea about
  // the user's local timezone — SSR'ing this would hydrate-mismatch).
  const [mood, setMood] = useState<Mood>("default");
  useEffect(() => setMood(autoMood()), []);

  // Rotating tagline. Cycles every ROTATE_MS. Pauses during submitting /
  // entering so we don't compete with the door choreography.
  const taglines = TAGLINE_POOLS[role];
  const [tagIdx, setTagIdx] = useState(0);
  useEffect(() => {
    if (reduced || phase !== "idle") return;
    const t = setInterval(
      () => setTagIdx((i) => (i + 1) % taglines.length),
      ROTATE_MS,
    );
    return () => clearInterval(t);
  }, [taglines, reduced, phase]);
  useEffect(() => setTagIdx(0), [role]);

  // Sub-greeting also rotates between two options per mood.
  const subGreetings = SUB_GREETINGS[mood];
  const [subIdx, setSubIdx] = useState(0);
  useEffect(() => {
    if (reduced || phase !== "idle") return;
    const t = setInterval(
      () => setSubIdx((i) => (i + 1) % subGreetings.length),
      ROTATE_MS + 800,
    );
    return () => clearInterval(t);
  }, [subGreetings, reduced, phase]);

  // Mouse parallax — tip the scene up to 12 px following the cursor.
  useEffect(() => {
    if (reduced) return;
    const node = wrapRef.current;
    if (!node) return;
    function onMove(e: MouseEvent) {
      const r = node!.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
      node!.style.setProperty("--px", `${x * 12}px`);
      node!.style.setProperty("--py", `${y * 8}px`);
    }
    function onLeave() {
      node!.style.setProperty("--px", "0px");
      node!.style.setProperty("--py", "0px");
    }
    node.addEventListener("mousemove", onMove);
    node.addEventListener("mouseleave", onLeave);
    return () => {
      node.removeEventListener("mousemove", onMove);
      node.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced]);

  const greeting = moodCopy(mood).greeting;

  return (
    <div
      ref={wrapRef}
      className="hidden lg:flex relative flex-col items-center justify-center px-8 select-none"
      style={
        {
          "--px": "0px",
          "--py": "0px",
        } as React.CSSProperties
      }
    >
      {/* Top copy — greeting + rotating sub + rotating tagline. */}
      <motion.div
        className="text-center mb-6 relative z-10 max-w-xs"
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT_SOFT }}
      >
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-brand-muted font-semibold mb-2">
          <Sparkles size={11} className="text-amber-500" />
          {greeting}
        </span>
        <p className="font-display font-extrabold text-3xl text-brand-ink leading-tight">
          {mode === "signin" ? "Welcome back." : "Welcome to unGhost."}
        </p>
        {/* Sub-greeting crossfades between options. */}
        <div className="h-5 mt-2 relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.span
              key={`sub-${mood}-${subIdx}`}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: EASE_OUT_SOFT }}
              className="absolute inset-0 text-sm text-brand-muted"
            >
              {subGreetings[subIdx]}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* The scene — door + ghost + halo + sparkles. */}
      <motion.div
        className="relative w-[280px] h-[300px]"
        style={{
          transform: "translate3d(var(--px), var(--py), 0)",
          transition: reduced ? undefined : "transform 200ms ease-out",
        }}
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, duration: 0.45, ease: EASE_OUT_SOFT }}
      >
        {/* Door — three layers: frame (outline), panel (swings open), knob. */}
        <svg
          viewBox="0 0 200 240"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          {/* Door frame outline (static) */}
          <motion.path
            d="M40 240 V40 Q40 20 60 20 H140 Q160 20 160 40 V240"
            fill="none"
            stroke="rgba(1, 145, 252, 0.30)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.7, ease: EASE_OUT_SOFT }}
          />

          {/* Light beam emerges from inside the door, scales up as it opens. */}
          <motion.path
            d="M100 50 L40 240 L160 240 Z"
            fill="url(#beamGradient)"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={
              phase === "idle"
                ? { opacity: 0, scaleY: 0 }
                : phase === "submitting"
                  ? { opacity: 0.35, scaleY: 0.4 }
                  : { opacity: 0.8, scaleY: 1 }
            }
            style={{ transformOrigin: "100px 50px" }}
            transition={{ duration: 0.5, ease: EASE_OUT_QUART }}
          />
          <defs>
            <linearGradient id="beamGradient" x1="100" y1="50" x2="100" y2="240" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
              <stop offset="60%" stopColor="rgba(1,145,252,0.20)" />
              <stop offset="100%" stopColor="rgba(1,145,252,0)" />
            </linearGradient>
          </defs>

          {/* Door panel — closed at idle, cracks open at submitting, swings
              open at entering. Uses CSS transform-style + rotateY for the
              3D pivot on the left edge. */}
          <motion.g
            initial={{ rotateY: 0 }}
            animate={
              phase === "idle"
                ? { rotateY: 0 }
                : phase === "submitting"
                  ? { rotateY: -8 }
                  : { rotateY: -88 }
            }
            transition={
              phase === "entering"
                ? { type: "spring", stiffness: 60, damping: 14, mass: 0.9 }
                : { duration: 0.4, ease: EASE_OUT_QUART }
            }
            style={{
              transformOrigin: "60px 20px",
              transformBox: "fill-box",
            }}
          >
            <rect
              x="60"
              y="20"
              width="100"
              height="220"
              fill="rgba(1,145,252,0.08)"
              stroke="rgba(1, 145, 252, 0.45)"
              strokeWidth="2"
              rx="4"
            />
            {/* Door knob on the right edge of the panel */}
            <circle cx="148" cy="130" r="3" fill="rgba(1, 145, 252, 0.6)" />
          </motion.g>
        </svg>

        {/* Halo behind ghost — pulses constantly, brightens during submit/enter. */}
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(1,145,252,0.35) 0%, transparent 65%)",
          }}
          initial={{ opacity: 0, width: 160, height: 160 }}
          animate={
            reduced
              ? { opacity: 0.4, width: 176, height: 176 }
              : phase === "idle"
                ? {
                    opacity: [0, 0.5, 0.35, 0.5, 0.4],
                    width: [160, 200, 220, 200, 200],
                    height: [160, 200, 220, 200, 200],
                  }
                : phase === "submitting"
                  ? { opacity: 0.65, width: 220, height: 220 }
                  : { opacity: 0.9, width: 280, height: 280 }
          }
          transition={
            phase === "idle"
              ? {
                  duration: 6,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "easeInOut",
                }
              : { duration: 0.5, ease: EASE_OUT_QUART }
          }
        />

        {/* Ghost — idle bob, leans toward door on submit, glides INTO door
            on enter (scales up + translates + fades). */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center w-24 h-24 rounded-3xl bg-brand-gradient text-white shadow-brand-glow"
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
          animate={
            reduced
              ? { opacity: 1 }
              : phase === "idle"
                ? { opacity: 1, scale: 1, y: [0, -4, 0, -3, 0], x: 0 }
                : phase === "submitting"
                  ? { opacity: 1, scale: 1.05, y: -2, x: 4 }
                  : { opacity: 0, scale: 1.6, y: -10, x: 0 }
          }
          transition={
            phase === "idle"
              ? {
                  opacity: { delay: 0.5, duration: 0.4 },
                  scale: { delay: 0.5, type: "spring", stiffness: 220, damping: 18 },
                  y: {
                    delay: 1,
                    duration: 3.4,
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "easeInOut",
                  },
                }
              : phase === "submitting"
                ? { duration: 0.3, ease: EASE_OUT_QUART }
                : { duration: 0.55, ease: EASE_OUT_QUART }
          }
        >
          <Ghost size={42} strokeWidth={1.5} />
        </motion.div>

        {/* Sparkle particles — drift slowly when idle, scatter outward during
            entering. */}
        {SPARKLES.map((s, i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="absolute rounded-full bg-amber-300"
            style={{
              left: `calc(50% + ${s.x}px)`,
              top: `calc(50% + ${s.y}px)`,
              width: s.size,
              height: s.size,
            }}
            initial={reduced ? { opacity: 0.5 } : { opacity: 0, scale: 0 }}
            animate={
              reduced
                ? { opacity: 0.5 }
                : phase === "entering"
                  ? {
                      opacity: 0,
                      scale: 1.4,
                      x: s.x * 0.6,
                      y: s.y * 0.6,
                    }
                  : {
                      opacity: phase === "submitting" ? [0.4, 1, 0.7, 1, 0.4] : [0, 0.9, 0.6, 0.9, 0],
                      scale: phase === "submitting" ? [0.8, 1.4, 1.1, 1.4, 0.8] : [0, 1, 1.2, 1, 0],
                    }
            }
            transition={{
              delay: 0.8 + i * 0.18,
              duration: phase === "entering" ? 0.6 : s.duration,
              repeat: phase === "entering" ? 0 : Infinity,
              repeatType: "loop",
              ease: "easeInOut",
            }}
          />
        ))}
      </motion.div>

      {/* Rotating tagline beneath the scene. */}
      <div className="h-10 mt-6 relative overflow-hidden max-w-xs w-full">
        <AnimatePresence mode="wait">
          <motion.p
            key={`tag-${role}-${tagIdx}`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE_OUT_SOFT }}
            className="absolute inset-0 text-center text-sm text-brand-ink/85 font-medium"
          >
            {taglines[tagIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="text-[10px] text-brand-muted mt-4 text-center max-w-xs">
        SLA-bound recruiters · AI-graded fit · Bootcamp-backed verification.
      </p>
    </div>
  );
}

const SPARKLES: Array<{ x: number; y: number; size: number; duration: number }> = [
  { x: -90, y: -40, size: 5, duration: 2.4 },
  { x: 80, y: -60, size: 4, duration: 2.8 },
  { x: -100, y: 70, size: 3, duration: 2.2 },
  { x: 100, y: 50, size: 5, duration: 2.6 },
  { x: -50, y: 110, size: 3, duration: 2.0 },
  { x: 60, y: 120, size: 4, duration: 2.5 },
];
