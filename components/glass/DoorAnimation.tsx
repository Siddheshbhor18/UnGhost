"use client";

/**
 * DoorAnimation — full-screen "ghost becomes employed" ceremony after login.
 *
 * Narrative: a casual Ghost walks through the unGhost door and emerges
 * transformed — wearing a tie, holding a briefcase, with glasses on,
 * and a role-specific badge. The platform's brand promise made literal.
 *
 * Timeline (≈3.4s total):
 *   0.00 – 0.40s   overlay fades in, greeting copy reveals
 *   0.40 – 1.20s   door swings open with warm light
 *   1.20 – 1.80s   Ghost emerges from doorway (scales up + slides into view)
 *   1.80 – 2.60s   TRANSFORMATION SEQUENCE (staggered accessory entries):
 *                  1.80s tie slides down onto chest
 *                  1.95s glasses slide in from sides over eyes
 *                  2.10s briefcase rises from below + role badge pops on
 *   2.60 – 3.00s   confetti bursts, ghost holds proud pose, caption renders
 *   3.00 – 3.40s   camera dollies forward + scene fades, route fires
 *
 * Admin fast-path: 0.5s soft fade (no transformation, no confetti).
 * Admins log in many times/day for ops — they don't want the show every time.
 *
 * Reduced motion / low memory: 0.32s fade with greeting only.
 */

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Heart, Moon, PartyPopper, Sparkles } from "lucide-react";
import { Ghost as GhostChar } from "@/components/auth/scene/Ghost";
import { Door } from "@/components/auth/scene/Door";
import { Briefcase } from "@/components/auth/scene/Briefcase";
import { Necktie } from "@/components/auth/scene/Necktie";
import { Glasses } from "@/components/auth/scene/Glasses";
import { RoleBadge, type RoleId } from "@/components/auth/scene/RoleBadge";
import { Confetti } from "@/components/auth/scene/Confetti";

export type Mood =
  | "default"
  | "morning"
  | "afternoon"
  | "evening"
  | "friday"
  | "late_night"
  | "long_absence";

interface Props {
  active: boolean;
  /** Student name for greeting line. Optional. */
  studentName?: string;
  /** Drives role-specific caption + confetti palette + badge. */
  role?: RoleId;
  /** Override mood — otherwise auto-detected. */
  mood?: Mood;
  /** Called when the animation completes. */
  onComplete?: () => void;
}

export function autoMood(): Mood {
  const now = new Date();
  const hr = now.getHours();
  const day = now.getDay();
  if (hr >= 23 || hr < 5) return "late_night";
  if (day === 5) return "friday";
  if (hr < 12) return "morning";
  if (hr < 17) return "afternoon";
  return "evening";
}

export function moodCopy(mood: Mood) {
  switch (mood) {
    case "morning":
      return {
        greeting: "Good morning",
        icon: <Sparkles size={14} className="text-amber-500" />,
      };
    case "afternoon":
      return {
        greeting: "Good afternoon",
        icon: <Sparkles size={14} className="text-amber-500" />,
      };
    case "evening":
      return {
        greeting: "Good evening",
        icon: <Moon size={14} className="text-brand-500" />,
      };
    case "friday":
      return {
        greeting: "Happy Friday",
        icon: <PartyPopper size={14} className="text-amber-500" />,
      };
    case "late_night":
      return {
        greeting: "Burning the midnight oil?",
        icon: <Moon size={14} className="text-brand-500" />,
      };
    case "long_absence":
      return {
        greeting: "Welcome back — missed you",
        icon: <Heart size={14} className="text-rose-500" />,
      };
    default:
      return {
        greeting: "Welcome back",
        icon: <Sparkles size={14} className="text-brand-500" />,
      };
  }
}

// Role + mood lookup → final caption shown during the celebration beat.
function getCaption(role: RoleId, mood: Mood): string {
  const CAPTIONS: Record<RoleId, Partial<Record<Mood, string>> & { default: string }> = {
    student: {
      morning: "Good morning. You're official.",
      late_night: "You're in. World's still asleep.",
      friday: "You're hired. Now enjoy the weekend.",
      default: "You're official.",
    },
    recruiter: {
      morning: "Hire mode engaged.",
      late_night: "Up late finding talent? Respect.",
      friday: "Hire someone. Then go home.",
      default: "Hire mode engaged.",
    },
    instructor: {
      morning: "Class is in session.",
      evening: "Office hours, professor.",
      late_night: "Grading at this hour? Champion.",
      default: "Class is in session.",
    },
    admin: {
      default: "Command center: yours.",
    },
  };
  const roleCaptions = CAPTIONS[role];
  return roleCaptions[mood] ?? roleCaptions.default;
}

// ── Animation variants ───────────────────────────────────────────────────

const EASE_OUT_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

const overlayV: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  dolly: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.4 } },
};

const sceneV: Variants = {
  hidden: { scale: 0.94, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.5, ease: EASE_OUT_SOFT },
  },
  dolly: {
    scale: 3.6,
    opacity: 0,
    transition: { duration: 0.6, ease: [0.65, 0, 0.35, 1] },
  },
};

const ghostV: Variants = {
  hidden: { y: 80, scale: 0.3, opacity: 0 },
  visible: {
    y: 0,
    scale: 1,
    opacity: 1,
    transition: {
      delay: 1.2,
      duration: 0.55,
      ease: EASE_OUT_QUART,
    },
  },
  dolly: { y: -20, scale: 1.4, opacity: 0.9 },
};

const captionV: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { delay: 2.6, duration: 0.45, ease: EASE_OUT_SOFT },
  },
  dolly: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const skipV: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: EASE_OUT_SOFT },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// ── Main component ───────────────────────────────────────────────────────

export function DoorAnimation({
  active,
  studentName,
  role = "student",
  mood: moodOverride,
  onComplete,
}: Props) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<"hidden" | "visible" | "dolly">("hidden");
  const [showSkip, setShowSkip] = useState(false);
  const [lowMem, setLowMem] = useState(false);
  const [doorPhase, setDoorPhase] = useState<"closed" | "open">("closed");
  const [showTransform, setShowTransform] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const mood = moodOverride ?? autoMood();
  const m = moodCopy(mood);
  const caption = getCaption(role, mood);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    setLowMem(typeof mem === "number" && mem < 4);
  }, []);

  // Admin fast path — minimal 500ms ceremony
  const isAdminPath = role === "admin" && !reduced && !lowMem;

  useEffect(() => {
    if (!active) {
      setStage("hidden");
      setShowSkip(false);
      setDoorPhase("closed");
      setShowTransform(false);
      setShowConfetti(false);
      return;
    }

    if (reduced || lowMem) {
      setStage("visible");
      const done = setTimeout(() => onComplete?.(), 320);
      return () => clearTimeout(done);
    }

    if (isAdminPath) {
      // Admin: quick fade + brief glow, no transformation, no confetti
      setStage("visible");
      const doorT = setTimeout(() => setDoorPhase("open"), 100);
      const dollyT = setTimeout(() => setStage("dolly"), 400);
      const doneT = setTimeout(() => onComplete?.(), 600);
      return () => {
        clearTimeout(doorT);
        clearTimeout(dollyT);
        clearTimeout(doneT);
      };
    }

    // Full ceremony
    setStage("visible");
    const doorT = setTimeout(() => setDoorPhase("open"), 400);
    const skipT = setTimeout(() => setShowSkip(true), 700);
    const transformT = setTimeout(() => setShowTransform(true), 1800);
    const confettiT = setTimeout(() => setShowConfetti(true), 2600);
    const dollyT = setTimeout(() => setStage("dolly"), 3000);
    const doneT = setTimeout(() => onComplete?.(), 3400);
    return () => {
      clearTimeout(doorT);
      clearTimeout(skipT);
      clearTimeout(transformT);
      clearTimeout(confettiT);
      clearTimeout(dollyT);
      clearTimeout(doneT);
    };
  }, [active, reduced, lowMem, isAdminPath, onComplete]);

  function handleSkip() {
    setStage("dolly");
    setTimeout(() => onComplete?.(), 260);
  }

  if (!active) return null;

  // Reduced motion / low memory fast-path
  if (reduced || lowMem) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] grid place-items-center bg-white pointer-events-auto"
        aria-hidden="true"
      >
        <div className="text-center">
          <p className="section-label inline-flex items-center gap-2 justify-center text-neutral-500">
            {m.icon} {m.greeting}
            {studentName ? "," : "!"}
          </p>
          {studentName && (
            <h2 className="font-display font-bold text-3xl text-neutral-900 mt-2 tracking-tight">
              {studentName}.
            </h2>
          )}
          <p className="mt-3 text-sm text-neutral-500">{caption}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="door-overlay"
        variants={overlayV}
        initial="hidden"
        animate={stage}
        exit="exit"
        className="fixed inset-0 z-[100] grid place-items-center pointer-events-auto overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 100% at 50% 45%, #FFFFFF 0%, #FCFCFB 35%, #E8F4FE 100%)",
          perspective: "1600px",
          perspectiveOrigin: "50% 45%",
        }}
        aria-hidden="true"
      >
        {/* Skip button */}
        <AnimatePresence>
          {showSkip && stage !== "dolly" && (
            <motion.button
              type="button"
              variants={skipV}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={handleSkip}
              className="absolute top-6 right-6 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-white hover:border-neutral-300 hover:text-neutral-900 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              Skip →
            </motion.button>
          )}
        </AnimatePresence>

        {/* Scene wrapper — camera dollies forward through this */}
        <motion.div
          variants={sceneV}
          initial="hidden"
          animate={stage}
          className="relative flex flex-col items-center"
          style={{ transformStyle: "preserve-3d", willChange: "transform" }}
        >
          {/* Greeting copy */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={
              stage === "dolly"
                ? { opacity: 0, y: -10 }
                : { opacity: 1, y: 0 }
            }
            transition={{
              delay: stage === "dolly" ? 0 : 0.15,
              duration: 0.4,
              ease: EASE_OUT_SOFT,
            }}
            className="text-center mb-8"
          >
            <p className="section-label inline-flex items-center gap-1.5 justify-center text-neutral-500">
              {m.icon} {m.greeting}
              {studentName ? "," : ""}
            </p>
            {studentName && (
              <h2 className="font-display font-bold text-4xl md:text-5xl text-neutral-900 mt-2 tracking-tight">
                {studentName}.
              </h2>
            )}
          </motion.div>

          {/* The stage — door + ghost + accessories + confetti */}
          <div
            className="relative"
            style={{ width: 340, height: 380 }}
          >
            {/* Door anchored to bottom */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
              <Door phase={doorPhase} width={240} />
            </div>

            {/* Confetti layer — behind/around ghost, in front of door */}
            <div className="absolute inset-0">
              <Confetti
                play={showConfetti}
                count={32}
                palette={role as any}
              />
            </div>

            {/* Ghost + accessories — stacked at center */}
            <motion.div
              variants={ghostV}
              initial="hidden"
              animate={stage}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ willChange: "transform, opacity" }}
            >
              <div className="relative" style={{ width: 150, height: 150 }}>
                {/* Ghost base */}
                <GhostChar phase={showTransform ? "success" : "idle"} size={150} />

                {/* Glasses — sit on eye line (eyes ~y=52 in 120 viewBox → 65px at scale 1.25) */}
                <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 53 }}>
                  <Glasses show={showTransform} delay={0.15} width={64} />
                </div>

                {/* Tie — sits on chest below mouth (mouth ~y=65, tie starts ~y=75 in viewBox → 94px scaled) */}
                <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 88 }}>
                  <Necktie show={showTransform} delay={0} width={22} />
                </div>

                {/* Briefcase — held at "hand" height in front of lower body */}
                <div className="absolute" style={{ left: "62%", top: 118 }}>
                  <Briefcase show={showTransform} delay={0.3} size={54}>
                    <RoleBadge
                      role={role}
                      show={showTransform}
                      delay={0.6}
                      size={22}
                    />
                  </Briefcase>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Caption beneath the scene — appears during celebration beat */}
          <motion.p
            variants={captionV}
            initial="hidden"
            animate={stage}
            className="mt-6 text-center font-display font-bold text-xl md:text-2xl text-neutral-900 tracking-tight"
          >
            {caption}
          </motion.p>
        </motion.div>

        {/* Subtle backdrop vignette */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 50%, rgba(10,10,10,0.08) 100%)",
          }}
        />

        {/* End-of-ceremony white wipe — expands as scene dollies forward */}
        <AnimatePresence>
          {stage === "dolly" && (
            <motion.div
              aria-hidden
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT_QUART }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-white"
              style={{ filter: "blur(8px)" }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
