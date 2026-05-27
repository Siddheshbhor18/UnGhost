"use client";

/**
 * AuthScene — composes the illustrated Ghost + Door into a single scene
 * with floor shadow, sparkles, dust motes, and phase-driven choreography.
 *
 * Replaces the inline SVG door + ghost div inside AuthHero. The hero file
 * now just renders <AuthScene phase={phase} /> and keeps its greeting +
 * tagline copy.
 *
 * Layered parallax: door, ghost, halo, sparkles each respond to mouse
 * with different depths (true 3D feel, not whole-scene translate).
 */

import { useEffect, useRef } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { Ghost, type GhostPhase } from "./Ghost";
import { Door, type DoorPhase } from "./Door";

export type AuthScenePhase =
  | "idle"
  | "typing"
  | "submitting"
  | "success"
  | "error";

interface Props {
  phase: AuthScenePhase;
}

const SPARKLES: Array<{
  x: number;
  y: number;
  size: number;
  color: string;
  shape: "dot" | "star" | "plus";
  duration: number;
}> = [
  { x: -110, y: -50, size: 6, color: "#FCD34D", shape: "star", duration: 2.4 },
  { x: 90, y: -80, size: 4, color: "#0191FC", shape: "plus", duration: 2.8 },
  { x: -130, y: 50, size: 5, color: "#A78BFA", shape: "dot", duration: 2.2 },
  { x: 120, y: 30, size: 6, color: "#FCD34D", shape: "star", duration: 2.6 },
  { x: 70, y: 130, size: 4, color: "#0191FC", shape: "plus", duration: 2.0 },
];

export function AuthScene({ phase }: Props) {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Map auth phase → door + ghost phases
  const doorPhase: DoorPhase =
    phase === "submitting" ? "ajar" : phase === "success" ? "open" : "closed";
  const ghostPhase: GhostPhase = phase;

  // Layered mouse parallax — RAF-throttled so we don't paint every mousemove.
  useEffect(() => {
    if (reduced) return;
    const node = wrapRef.current;
    if (!node) return;
    let rafId = 0;
    let pendingX = 0;
    let pendingY = 0;
    let dirty = false;

    function flush() {
      rafId = 0;
      if (!dirty) return;
      dirty = false;
      node!.style.setProperty("--door-x", `${pendingX * 6}px`);
      node!.style.setProperty("--door-y", `${pendingY * 4}px`);
      node!.style.setProperty("--ghost-x", `${pendingX * 14}px`);
      node!.style.setProperty("--ghost-y", `${pendingY * 10}px`);
      node!.style.setProperty("--sparkle-x", `${pendingX * 20}px`);
      node!.style.setProperty("--sparkle-y", `${pendingY * 16}px`);
    }

    function onMove(e: MouseEvent) {
      const r = node!.getBoundingClientRect();
      pendingX = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pendingY = ((e.clientY - r.top) / r.height - 0.5) * 2;
      dirty = true;
      if (!rafId) rafId = requestAnimationFrame(flush);
    }
    function onLeave() {
      pendingX = 0;
      pendingY = 0;
      dirty = true;
      if (!rafId) rafId = requestAnimationFrame(flush);
    }

    // Use document-level listener but ignore events outside the scene — much
    // cheaper than re-binding, and keeps state predictable.
    node.addEventListener("mousemove", onMove, { passive: true });
    node.addEventListener("mouseleave", onLeave, { passive: true });
    return () => {
      node.removeEventListener("mousemove", onMove);
      node.removeEventListener("mouseleave", onLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [reduced]);

  return (
    <div
      ref={wrapRef}
      className="relative"
      style={
        {
          width: 320,
          height: 360,
          "--door-x": "0px",
          "--door-y": "0px",
          "--ghost-x": "0px",
          "--ghost-y": "0px",
          "--sparkle-x": "0px",
          "--sparkle-y": "0px",
        } as React.CSSProperties
      }
    >
      {/* Door — anchored to bottom, parallax shallow */}
      <div
        className="absolute left-1/2 bottom-0 -translate-x-1/2"
        style={{
          transform:
            "translate3d(calc(-50% + var(--door-x)), var(--door-y), 0)",
          transition: reduced ? undefined : "transform 220ms ease-out",
        }}
      >
        <Door phase={doorPhase} width={220} />
      </div>

      {/* Ghost — positioned in front of door, parallax medium */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          transform:
            "translate3d(calc(-50% + var(--ghost-x)), calc(-50% + var(--ghost-y)), 0)",
          transition: reduced ? undefined : "transform 200ms ease-out",
        }}
      >
        {/* Ghost itself, with phase-driven entry into the door on success */}
        <motion.div
          animate={
            reduced
              ? undefined
              : phase === "success"
                ? { y: [-0, -8, -40], scale: [1, 1.1, 0.6], opacity: [1, 1, 0] }
                : phase === "submitting"
                  ? { y: [0, -4, 0, -3, 0] }
                  : phase === "error"
                    ? { x: [0, -8, 8, -6, 6, 0] }
                    : { y: [0, -6, 0, -4, 0] }
          }
          transition={
            reduced
              ? undefined
              : phase === "success"
                ? { duration: 0.9, ease: [0.22, 1, 0.36, 1] }
                : phase === "submitting"
                  ? { duration: 1.0, repeat: Infinity, ease: "easeInOut" }
                  : phase === "error"
                    ? { duration: 0.4, ease: "easeInOut" }
                    : {
                        duration: 3.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
          }
        >
          <Ghost phase={ghostPhase} size={130} />
        </motion.div>

        {/* Soft ground shadow under ghost — pulses with idle bob */}
        <motion.div
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: 130,
            width: 80,
            height: 12,
            background:
              "radial-gradient(ellipse, rgba(10,10,10,0.28) 0%, transparent 70%)",
            borderRadius: "50%",
            filter: "blur(2px)",
          }}
          animate={
            reduced
              ? undefined
              : { scaleX: [1, 0.92, 1], opacity: [0.7, 0.55, 0.7] }
          }
          transition={
            reduced
              ? undefined
              : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </div>

      {/* Sparkles layer — most aggressive parallax (depth = far) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform:
            "translate3d(var(--sparkle-x), var(--sparkle-y), 0)",
          transition: reduced ? undefined : "transform 220ms ease-out",
        }}
      >
        {SPARKLES.map((s, i) => (
          <SparkleShape
            key={i}
            x={s.x}
            y={s.y}
            size={s.size}
            color={s.color}
            shape={s.shape}
            duration={s.duration}
            delay={i * 0.18}
            scattered={phase === "success"}
            intensified={phase === "submitting"}
            reduced={!!reduced}
          />
        ))}
      </div>

      {/* Error halo flash — covers scene briefly when phase=error */}
      <AnimatePresence>
        {phase === "error" && !reduced && (
          <motion.div
            aria-hidden
            className="absolute inset-0 pointer-events-none rounded-full"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: [0, 0.5, 0],
              scale: [0.5, 1.4, 1.6],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
              background:
                "radial-gradient(circle, rgba(220,38,38,0.35) 0%, transparent 60%)",
              filter: "blur(8px)",
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SparkleShape({
  x,
  y,
  size,
  color,
  shape,
  duration,
  delay,
  scattered,
  intensified,
  reduced,
}: {
  x: number;
  y: number;
  size: number;
  color: string;
  shape: "dot" | "star" | "plus";
  duration: number;
  delay: number;
  scattered: boolean;
  intensified: boolean;
  reduced: boolean;
}) {
  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        width: size * 2,
        height: size * 2,
        marginLeft: -size,
        marginTop: -size,
        x,
        y,
      }}
      animate={
        reduced
          ? { opacity: 0.5 }
          : scattered
            ? {
                opacity: 0,
                scale: 1.8,
                x: x * 1.5,
                y: y * 1.5,
              }
            : {
                opacity: intensified
                  ? [0.4, 1, 0.7, 1, 0.4]
                  : [0, 0.9, 0.5, 0.9, 0],
                scale: intensified
                  ? [0.8, 1.3, 1.0, 1.3, 0.8]
                  : [0, 1, 1.2, 1, 0],
                rotate: shape === "star" ? [0, 90, 180] : 0,
              }
      }
      transition={{
        delay,
        duration: scattered ? 0.7 : intensified ? duration * 0.6 : duration,
        repeat: scattered ? 0 : Infinity,
        ease: "easeInOut",
      }}
    >
      {shape === "dot" && (
        <div
          className="w-full h-full rounded-full"
          style={{
            background: color,
            boxShadow: `0 0 ${size * 1.5}px ${color}`,
          }}
        />
      )}
      {shape === "star" && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path
            d="M 12 2 L 14 10 L 22 12 L 14 14 L 12 22 L 10 14 L 2 12 L 10 10 Z"
            fill={color}
            style={{ filter: `drop-shadow(0 0 ${size}px ${color})` }}
          />
        </svg>
      )}
      {shape === "plus" && (
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path
            d="M 12 4 L 12 20 M 4 12 L 20 12"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 ${size}px ${color})` }}
          />
        </svg>
      )}
    </motion.div>
  );
}
