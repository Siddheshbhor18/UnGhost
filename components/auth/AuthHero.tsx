"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import {
  autoMood,
  moodCopy,
  type Mood,
} from "@/components/glass/DoorAnimation";
import { AuthScene } from "./scene/AuthScene";
import type { Role } from "./RolePicker";

/**
 * AuthHero — desktop-only animated illustration on the right side of the
 * sign-in / sign-up pages.
 *
 * `phase` drives the AuthScene composition (Ghost + Door):
 *   idle        Default. Ghost bobs in front of closed door.
 *   typing      User is filling fields. Ghost watches with focus.
 *   submitting  Server roundtrip in flight. Door cracks ajar, ghost excited.
 *   entering    Maps to "success" in the scene → ghost glides into open door.
 *   error       Halo flashes rose, ghost startled, shakes side-to-side.
 *
 * Mobile (< lg) hides the hero entirely.
 */
export type AuthHeroPhase =
  | "idle"
  | "typing"
  | "submitting"
  | "entering"
  | "error";

interface Props {
  role: Role;
  mode: "signin" | "signup";
  phase?: AuthHeroPhase;
}

const EASE_OUT_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1];

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

  // Time-of-day mood, computed client-side only.
  const [mood, setMood] = useState<Mood>("default");
  useEffect(() => setMood(autoMood()), []);

  // Rotating tagline.
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

  // Sub-greeting rotates between two options per mood.
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

  // Map hero phase → scene phase
  const scenePhase =
    phase === "entering" ? "success" : phase;

  const greeting = moodCopy(mood).greeting;

  return (
    <div className="hidden lg:flex relative flex-col items-center justify-center px-8 select-none">
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

      {/* The scene — door + ghost + sparkles + floor shadow */}
      <AuthScene phase={scenePhase} />

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
