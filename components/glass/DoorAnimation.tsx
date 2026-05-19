"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Heart, Moon, PartyPopper, Sparkles } from "lucide-react";

type Mood =
  | "default"
  | "morning"
  | "afternoon"
  | "evening"
  | "friday"
  | "late_night"
  | "long_absence";

interface Props {
  active: boolean;
  studentName?: string;
  /** Override mood — otherwise auto-detected. */
  mood?: Mood;
  /** Called when the animation completes (~3.0s). */
  onComplete?: () => void;
}

function autoMood(): Mood {
  const now = new Date();
  const hr = now.getHours();
  const day = now.getDay();
  // Late-night first (overrides Friday for 11pm+ sessions).
  if (hr >= 23 || hr < 5) return "late_night";
  if (day === 5) return "friday";
  // Real time-of-day split — previously every login between 5am and 11pm
  // greeted "Good morning", which was wrong for the 11+ hours after noon.
  if (hr < 12) return "morning";
  if (hr < 17) return "afternoon";
  return "evening";
}

function moodCopy(mood: Mood) {
  switch (mood) {
    case "morning":
      return { greeting: "Good morning", icon: <Sparkles size={14} className="text-amber-500" /> };
    case "afternoon":
      return { greeting: "Good afternoon", icon: <Sparkles size={14} className="text-amber-500" /> };
    case "evening":
      return { greeting: "Good evening", icon: <Moon size={14} className="text-brand-500" /> };
    case "friday":
      return { greeting: "Happy Friday", icon: <PartyPopper size={14} className="text-amber-500" /> };
    case "late_night":
      return { greeting: "Burning the midnight oil?", icon: <Moon size={14} className="text-brand-500" /> };
    case "long_absence":
      return { greeting: "Welcome back — missed you", icon: <Heart size={14} className="text-rose-500" /> };
    default:
      return { greeting: "Welcome back", icon: <Sparkles size={14} className="text-brand-500" /> };
  }
}

/**
 * Timeline (seconds) — total ≈ 3.0s.
 *
 *   0.00 – 0.35 : overlay + welcome copy fade in
 *   0.35 – 0.75 : door outline draws (line-art SVG)
 *   0.75 – 1.55 : door panel swings open (spring overshoot) + light beam + sparkles
 *   1.55 – 2.40 : ghost emerges from doorway, walks STRAIGHT forward (scale up)
 *   2.40 – 2.85 : ghost floats UP and out of view; halo glow expands
 *   2.85 – 3.00 : camera dolly forward through doorway, scene fades out
 */
const EASE_OUT_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];
const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

// Overlay is opaque from frame 0 — no fade-in. The interior scene fades in
// instead so the login form is never visible through the wash.
const overlayV: Variants = {
  hidden: { opacity: 1 },
  open:   { opacity: 1 },
  dolly:  { opacity: 1 },
  exit:   { opacity: 0, transition: { duration: 0.3 } },
};

const sceneV: Variants = {
  hidden: { scale: 0.94, opacity: 0 },
  open:   { scale: 1,    opacity: 1, transition: { duration: 0.45, ease: EASE_OUT_SOFT } },
  dolly:  { scale: 4.4,  opacity: 0, transition: { duration: 0.55, ease: EASE_IN_OUT } },
};

const copyV: Variants = {
  hidden: { opacity: 0, y: 14 },
  open:   { opacity: 1, y: 0,  transition: { delay: 0.1, duration: 0.4, ease: EASE_OUT_SOFT } },
  dolly:  { opacity: 0, y: -10, transition: { duration: 0.25 } },
};

const outlineV: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  open:   {
    pathLength: 1,
    opacity: 1,
    transition: { delay: 0.35, duration: 0.4, ease: EASE_OUT_SOFT },
  },
  dolly: { pathLength: 1, opacity: 1 },
};

const beamV: Variants = {
  hidden: { opacity: 0, scaleX: 0 },
  open:   {
    opacity: [0, 0.4, 1, 1],
    scaleX: [0, 0.3, 1, 1.05],
    transition: {
      delay: 0.75,
      duration: 1.3,
      ease: EASE_OUT_QUART,
      times: [0, 0.3, 0.8, 1],
    },
  },
  dolly:  { opacity: 1, scaleX: 1.1 },
};

const haloV: Variants = {
  hidden: { opacity: 0, scale: 0.6 },
  open: {
    opacity: [0, 0, 0.5, 0.85, 0.95, 0.4],
    scale:   [0.6, 0.6, 1.0, 1.6, 2.4, 3.2],
    transition: {
      duration: 3.0,
      times: [0, 0.51, 0.6, 0.78, 0.92, 1],
      ease: EASE_OUT_QUART,
    },
  },
  dolly: { opacity: 0.2, scale: 3.4 },
};

const panelV: Variants = {
  hidden: { rotateY: 0 },
  open:   {
    rotateY: -118,
    transition: {
      delay: 0.75,
      duration: 0.8,
      type: "spring",
      stiffness: 60,
      damping: 12,
      mass: 0.9,
    },
  },
  dolly:  { rotateY: -120 },
};

const ghostV: Variants = {
  hidden: { opacity: 0, scale: 0.25, x: 0, y: 0, z: -120 },
  open: {
    // Emerges from middle of doorway:
    //   1.55s — invisible deep behind the door (z=-120, scale 0.25)
    //   1.85s — appears at door plane (z=0,    scale 0.6)
    //   2.20s — walks forward toward viewer  (z=80,   scale 1.0)
    //   2.55s — starts to lift              (y=-30, scale 1.15)
    //   2.85s — floats straight up & away   (y=-180, scale 1.3)
    opacity: [0, 1, 1, 1, 0.92],
    scale:   [0.25, 0.6, 1.0, 1.15, 1.3],
    x:       [0, 0, 0, 0, 0],
    y:       [0, 0, 0, -30, -180],
    z:       [-120, 0, 80, 120, 160],
    transition: {
      delay: 1.55,
      duration: 1.3,
      ease: EASE_OUT_QUART,
      times: [0, 0.23, 0.5, 0.78, 1],
    },
  },
  dolly: { opacity: 0, scale: 1.4, y: -260, z: 200 },
};

// Continuous gentle bob layered ON TOP of the main trajectory.
// (rendered on a child wrapper so transforms compose)
const ghostBobV: Variants = {
  hidden: { y: 0 },
  open: {
    y: [0, -3, 0, -3, 0],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      repeatType: "loop",
      ease: "easeInOut",
    },
  },
  dolly: { y: 0 },
};

const sparklesV: Variants = {
  hidden: { opacity: 0 },
  open:   { opacity: 1, transition: { delay: 1.0, duration: 0.3 } },
  dolly:  { opacity: 0, transition: { duration: 0.2 } },
};

const skipV: Variants = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT_SOFT } },
  exit:   { opacity: 0, transition: { duration: 0.2 } },
};

// Sparkle dust positions (relative to doorway center, scattered)
const SPARKLES: Array<{ x: number; y: number; size: number; delay: number; duration: number }> = [
  { x: -50, y: -30,  size: 5,  delay: 0,    duration: 1.4 },
  { x:  40, y: -50,  size: 4,  delay: 0.15, duration: 1.6 },
  { x: -70, y:  20,  size: 3,  delay: 0.3,  duration: 1.5 },
  { x:  60, y:  10,  size: 6,  delay: 0.05, duration: 1.7 },
  { x: -30, y:  60,  size: 3,  delay: 0.35, duration: 1.3 },
  { x:  20, y:  80,  size: 4,  delay: 0.2,  duration: 1.5 },
  { x:  80, y: -10,  size: 3,  delay: 0.4,  duration: 1.4 },
  { x: -90, y: -10,  size: 4,  delay: 0.1,  duration: 1.6 },
];

/**
 * Signature door animation — Screen 3 of the design system.
 *
 * Choreographed via framer-motion variants (no setTimeout drift).
 * Hardware-accelerated transform + opacity only.
 *
 * Honours prefers-reduced-motion and `navigator.deviceMemory < 4`.
 * Skip button at 600 ms per spec.
 */
export function DoorAnimation({
  active,
  studentName,
  mood: moodOverride,
  onComplete,
}: Props) {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<"hidden" | "open" | "dolly">("hidden");
  const [showSkip, setShowSkip] = useState(false);
  const [lowMem, setLowMem] = useState(false);
  const mood = moodOverride ?? autoMood();
  const m = moodCopy(mood);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
    setLowMem(typeof mem === "number" && mem < 4);
  }, []);

  useEffect(() => {
    if (!active) {
      setStage("hidden");
      setShowSkip(false);
      return;
    }

    // Fast path — reduced motion or low memory.
    if (reduced || lowMem) {
      setStage("open");
      const done = setTimeout(() => onComplete?.(), 320);
      return () => clearTimeout(done);
    }

    setStage("open");
    const skipT  = setTimeout(() => setShowSkip(true), 600);
    const dollyT = setTimeout(() => setStage("dolly"), 2850);
    const doneT  = setTimeout(() => onComplete?.(), 3000);
    return () => {
      clearTimeout(skipT);
      clearTimeout(dollyT);
      clearTimeout(doneT);
    };
  }, [active, reduced, lowMem, onComplete]);

  function handleSkip() {
    setStage("dolly");
    setTimeout(() => onComplete?.(), 260);
  }

  if (!active) return null;

  // ── Fast-path render (reduced motion / low memory) ──
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
            {m.icon} {m.greeting}{studentName ? "," : "!"}
          </p>
          {studentName && (
            <h2 className="font-display font-bold text-3xl text-neutral-900 mt-2 tracking-tight">
              {studentName}.
            </h2>
          )}
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

        {/* Scene wrapper — the camera dollies forward through this */}
        <motion.div
          variants={sceneV}
          initial="hidden"
          animate={stage}
          className="relative flex flex-col items-center"
          style={{ transformStyle: "preserve-3d", willChange: "transform" }}
        >
          {/* Welcome microcopy */}
          <motion.div
            variants={copyV}
            initial="hidden"
            animate={stage}
            className="text-center mb-14"
          >
            <p className="section-label inline-flex items-center gap-1.5 justify-center text-neutral-500">
              {m.icon} {m.greeting}{studentName ? "," : ""}
            </p>
            {studentName && (
              <h2 className="font-display font-bold text-4xl md:text-5xl text-neutral-900 mt-2 tracking-tight">
                {studentName}.
              </h2>
            )}
          </motion.div>

          {/* Door frame — 3D container holds outline, beam, panel, ghost, sparkles, halo */}
          <div
            className="relative w-48 h-64"
            style={{ transformStyle: "preserve-3d", willChange: "transform" }}
          >
            {/* Halo glow behind ghost (expands as ghost approaches viewer) */}
            <motion.div
              variants={haloV}
              initial="hidden"
              animate={stage}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                width: 280,
                height: 280,
                background:
                  "radial-gradient(circle, rgba(1,145,252,0.35) 0%, rgba(1,145,252,0.10) 40%, transparent 70%)",
                filter: "blur(8px)",
                willChange: "transform, opacity",
              }}
            />

            {/* Line-art frame SVG — strokes draw in */}
            <svg
              viewBox="0 0 100 140"
              className="absolute inset-0 w-full h-full overflow-visible"
              fill="none"
              stroke="#0191FC"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M 6 140 L 6 22 Q 6 6 22 6 L 78 6 Q 94 6 94 22 L 94 140"
                variants={outlineV}
                initial="hidden"
                animate={stage}
              />
              <motion.line
                x1="6"
                y1="140"
                x2="94"
                y2="140"
                variants={outlineV}
                initial="hidden"
                animate={stage}
                stroke="#0191FC"
                strokeWidth="3"
              />
            </svg>

            {/* Warm light beam through the open doorway */}
            <motion.div
              variants={beamV}
              initial="hidden"
              animate={stage}
              className="absolute inset-1 rounded-t-[20px] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 70% 90% at 15% 50%, rgba(255,228,164,0.95) 0%, rgba(253,224,71,0.50) 28%, rgba(255,255,255,0.25) 55%, transparent 75%)",
                transformOrigin: "left center",
                filter: "blur(0.5px)",
              }}
            />

            {/* Ghost — sits BEHIND the door panel in DOM order, gets revealed
                 when the panel swings open. Emerges from the middle of the
                 doorway, comes forward, then floats straight up.
                 Centering is on the outer absolute wrapper so framer-motion
                 owns the inner transform without fighting Tailwind. */}
            <div
              className="absolute inset-0 grid place-items-center pointer-events-none"
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.div
                variants={ghostV}
                initial="hidden"
                animate={stage}
                style={{
                  willChange: "transform, opacity",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Gentle continuous bob layered on top of main trajectory */}
                <motion.div
                  variants={ghostBobV}
                  initial="hidden"
                  animate={stage}
                >
                  {/* Logo-style symbol — brand gradient bg + brand glow */}
                  <div
                    className="grid place-items-center w-20 h-20 rounded-2xl"
                    style={{
                      background:
                        "linear-gradient(135deg, #0191FC 0%, #3454DA 100%)",
                      boxShadow:
                        "0 0 32px rgba(1,145,252,0.55), 0 12px 32px rgba(1,145,252,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
                    }}
                  >
                    <img
                      src="/symbol.svg"
                      alt="unGhost"
                      width={48}
                      height={48}
                      style={{ filter: "brightness(0) invert(1)" }}
                    />
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Door PANEL — swings open at left hinge with spring overshoot.
                 In DOM AFTER ghost so it covers it while closed. */}
            <motion.div
              variants={panelV}
              initial="hidden"
              animate={stage}
              className="absolute inset-1 rounded-t-[20px] border-2 border-brand-500 shadow-elev-4"
              style={{
                transformOrigin: "left center",
                transformStyle: "preserve-3d",
                backfaceVisibility: "hidden",
                background:
                  "linear-gradient(135deg, rgba(197,226,253,0.95) 0%, rgba(232,244,254,0.85) 100%)",
                willChange: "transform",
              }}
            >
              <div className="absolute inset-3 rounded-[14px] border border-brand-200/60" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/2 h-3/5 rounded-[10px] border border-brand-200/40" />
              <div className="absolute top-1/2 right-3 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-brand-700 shadow-md" />
            </motion.div>

            {/* Sparkle dust drifting from the open doorway — rendered on top */}
            <motion.div
              variants={sparklesV}
              initial="hidden"
              animate={stage}
              className="absolute inset-0 pointer-events-none"
            >
              {SPARKLES.map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 rounded-full bg-brand-400"
                  style={{
                    width: s.size,
                    height: s.size,
                    boxShadow: "0 0 8px rgba(1,145,252,0.7)",
                  }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={
                    stage === "open" || stage === "dolly"
                      ? {
                          x: s.x,
                          y: s.y,
                          opacity: [0, 1, 1, 0],
                          scale: [0, 1, 1, 0.4],
                        }
                      : { opacity: 0 }
                  }
                  transition={{
                    delay: 1.0 + s.delay,
                    duration: s.duration,
                    ease: EASE_OUT_QUART,
                    times: [0, 0.2, 0.7, 1],
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Subtle backdrop vignette — depth without competing with door */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 50%, rgba(10,10,10,0.06) 100%)",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
