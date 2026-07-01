"use client";

/**
 * HeroDemoLoop — auto-cycling product demo for hero right column.
 *
 * Floating-tiles design: NO outer card chrome. Each frame is a freestanding
 * tile with its own glass backdrop + subtle tilt. The frames are the story,
 * not a wrapper.
 *
 * Frames (11s total loop):
 *   0  Resume drop     (2.2s)  — dashed drop zone
 *   1  Parsing         (2.2s)  — laser scan + skill chips fly in
 *   2  Matched jobs    (2.2s)  — 3 ranked job cards, React highlighted
 *   3  SLA promise     (2.2s)  — top card flips, SLA badge spring-in
 *   4  Reply received  (2.2s)  — chat bubble + green SLA-met
 *
 * Skill→job continuity: "React" appears as a chip in Frame 1, then is
 * highlighted in the top match card in Frames 2 and 3.
 *
 * Company names here are ILLUSTRATIVE placeholders, not real customers.
 * A "Demo" pill on the frame strip tells the visitor so — no fake social proof.
 */

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  Variants,
} from "framer-motion";
import {
  Upload,
  FileText,
  Target,
  Clock,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { MagicWidget } from "@/components/landing/MagicWidget";

const FRAME_MS = 2200;
const TOTAL_FRAMES = 5;

const SKILLS = ["React", "TypeScript", "Product", "Figma", "Node.js"];
// Illustrative placeholders — not real companies. See file header.
const JOBS = [
  {
    co: "Northwind",
    role: "Senior Product Engineer",
    match: 92,
    sla: 24,
    skills: ["React", "Node", "PG"],
  },
  {
    co: "Lumen Labs",
    role: "Frontend Lead",
    match: 87,
    sla: 48,
    skills: ["React", "TS", "Next"],
  },
  {
    co: "Vector",
    role: "Staff PM",
    match: 81,
    sla: 72,
    skills: ["API", "B2B"],
  },
];

export function HeroDemoLoop() {
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const [stopped, setStopped] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce || stopped) return;
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % TOTAL_FRAMES);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [reduce, stopped]);

  useEffect(() => {
    function onFileActivity() {
      setStopped(true);
    }
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("dragover", onFileActivity);
    el.addEventListener("drop", onFileActivity);
    return () => {
      el.removeEventListener("dragover", onFileActivity);
      el.removeEventListener("drop", onFileActivity);
    };
  }, []);

  if (reduce || stopped) {
    return <MagicWidget />;
  }

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center"
      style={{ minHeight: 460 }}
    >
      {/* Centered dot indicator strip + honest "Demo" tag — top */}
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_FRAMES }).map((_, i) => (
            <span
              key={i}
              className={`block h-1 rounded-full transition-all duration-500 ${
                i === frame ? "w-6 bg-brand-500" : "w-1 bg-brand-500/25"
              }`}
            />
          ))}
        </div>
        <span className="rounded-full bg-neutral-900/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Demo · sample data
        </span>
      </div>

      <div className="relative w-full">
        <AnimatePresence mode="wait">
          {frame === 0 && <FrameDrop key="drop" />}
          {frame === 1 && <FrameParse key="parse" />}
          {frame === 2 && <FrameMatch key="match" />}
          {frame === 3 && <FrameSLA key="sla" />}
          {frame === 4 && <FrameReply key="reply" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Frame variants ───────────────────────────────────────────────────────

const frameVariants: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.97,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

// Shared glass tile styling — used by individual frame elements, no outer card
const tileGlass =
  "rounded-2xl border border-white/60 bg-white/80 backdrop-blur-2xl shadow-elev-3";

// ── Frame 0: Drop ─────────────────────────────────────────────────────────

function FrameDrop() {
  return (
    <motion.div
      variants={frameVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col items-center gap-3"
    >
      <motion.div
        className={`${tileGlass} w-full max-w-[320px] mx-auto p-10 text-center border-2 border-dashed border-brand-500/40 bg-brand-500/[0.04]`}
        animate={{
          borderColor: [
            "rgba(1,145,252,0.35)",
            "rgba(1,145,252,0.75)",
            "rgba(1,145,252,0.35)",
          ],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        style={{ rotate: "-1deg" }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Upload size={36} className="mx-auto text-brand-500 mb-3" />
        </motion.div>
        <p className="font-display text-lg font-bold text-neutral-900 mb-1">
          Drop your resume
        </p>
        <p className="text-sm text-neutral-500">
          PDF or DOCX · parsed in seconds
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── Frame 1: Parse ────────────────────────────────────────────────────────

function FrameParse() {
  return (
    <motion.div
      variants={frameVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col gap-3"
    >
      <div
        className={`${tileGlass} relative p-5 overflow-hidden`}
        style={{ rotate: "0.5deg" }}
      >
        <motion.div
          className="absolute left-0 right-0 h-20 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(1,145,252,0) 0%, rgba(1,145,252,0.25) 50%, rgba(1,145,252,0) 100%)",
          }}
          initial={{ top: "-20%" }}
          animate={{ top: "100%" }}
          transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity }}
        />
        <div className="relative flex items-center gap-2 mb-2">
          <FileText size={16} className="text-brand-500" />
          <p className="text-sm font-semibold text-neutral-900 truncate">
            arjun_resume.pdf
          </p>
        </div>
        <p className="relative text-xs text-neutral-500 mb-3">
          Reading skills, history, impact…
        </p>
        <div className="relative flex flex-wrap gap-1.5">
          {SKILLS.map((s, i) => (
            <motion.span
              key={s}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.12, duration: 0.35 }}
              className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                s === "React"
                  ? "bg-brand-500 text-white border border-brand-500"
                  : "bg-brand-500/10 text-brand-500 border border-brand-500/20"
              }`}
            >
              {s}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Frame 2: Match ────────────────────────────────────────────────────────

function FrameMatch() {
  return (
    <motion.div
      variants={frameVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-2 mb-1 px-1">
        <Target size={14} className="text-brand-500" />
        <p className="text-sm font-semibold text-neutral-900">
          3 matches found
        </p>
      </div>
      {JOBS.map((j, i) => (
        <motion.div
          key={j.co}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 0.1 + i * 0.18,
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
          className={`${tileGlass} p-3 flex items-center justify-between gap-3`}
          style={{ rotate: i === 0 ? "-0.5deg" : i === 1 ? "0.3deg" : "-0.2deg" }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-neutral-900 truncate">
              {j.co}
            </p>
            <p className="text-[11px] text-neutral-500 truncate mb-1.5">
              {j.role}
            </p>
            <div className="flex flex-wrap gap-1">
              {j.skills.map((s) => (
                <span
                  key={s}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    s === "React"
                      ? "bg-brand-500 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base font-extrabold text-brand-500 tnum">
              {j.match}%
            </p>
            <p className="text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">
              match
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Frame 3: SLA flip ─────────────────────────────────────────────────────

function FrameSLA() {
  return (
    <motion.div
      variants={frameVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col gap-3"
    >
      <p className="text-xs text-neutral-500 px-1">Top match. Your move.</p>
      <motion.div
        initial={{ rotateY: 90 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "center", perspective: 800, rotate: "-0.5deg" }}
        className={`${tileGlass} border-2 border-brand-500 bg-brand-500/5 p-5`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold text-neutral-900">Northwind</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Senior Product Engineer · Bangalore
            </p>
            <p className="text-xs text-neutral-700 mt-2">₹35–60 LPA</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {["React", "Node", "PG"].map((s) => (
                <span
                  key={s}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    s === "React"
                      ? "bg-brand-500 text-white"
                      : "bg-neutral-100 text-neutral-600"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{
              delay: 0.4,
              type: "spring",
              damping: 12,
              stiffness: 220,
            }}
            className="shrink-0 inline-flex items-center gap-1 rounded-full bg-error/10 border border-error/30 px-2.5 py-1 text-[11px] font-bold text-error"
          >
            <Clock size={11} /> 24h SLA
          </motion.div>
        </div>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="text-[11px] text-brand-500 font-semibold mt-3 inline-flex items-center gap-1"
        >
          <CheckCircle2 size={12} /> Reply in 24h or get refunded
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// ── Frame 4: Reply ────────────────────────────────────────────────────────

function FrameReply() {
  return (
    <motion.div
      variants={frameVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col gap-3"
    >
      <p className="text-xs text-neutral-500 px-1">Northwind · 3h ago</p>
      <div
        className={`${tileGlass} p-4`}
        style={{ rotate: "0.4deg" }}
      >
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-start gap-3"
        >
          <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 grid place-items-center text-white text-sm font-bold">
            NW
          </div>
          <div className="flex-1">
            <div className="rounded-2xl rounded-tl-sm bg-neutral-100 px-3.5 py-2.5">
              <p className="text-sm text-neutral-900 leading-relaxed">
                Hey Arjun — your profile is a strong fit. Free for a quick
                call Thursday?
              </p>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1.5 flex items-center gap-1">
              <CheckCircle2 size={10} className="text-success" /> SLA met · 21h
              early
            </p>
          </div>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: 0.5,
          type: "spring",
          damping: 14,
          stiffness: 200,
        }}
        className="inline-flex self-start items-center gap-1.5 rounded-full bg-success/10 border border-success/30 px-3 py-1 text-[11px] font-bold text-success ml-1"
      >
        <MessageCircle size={11} /> Recruiter replied
      </motion.div>
    </motion.div>
  );
}
