"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * CursorGlow — a soft radial gradient that follows the cursor across the
 * auth surface. Anchored via CSS variables for cheap GPU-friendly updates
 * (no React state, no re-renders). Reads as "the page is alive" without
 * being distracting.
 *
 * Drops to a static gradient when prefers-reduced-motion is on.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const node = ref.current;
    if (!node) return;
    // Default the glow to the upper-middle so we have something to render
    // before the first mousemove lands.
    node.style.setProperty("--gx", "50%");
    node.style.setProperty("--gy", "30%");

    let frame = 0;
    let targetX = 50;
    let targetY = 30;
    let currentX = 50;
    let currentY = 30;

    function onMove(e: MouseEvent) {
      targetX = (e.clientX / window.innerWidth) * 100;
      targetY = (e.clientY / window.innerHeight) * 100;
      if (!frame) frame = requestAnimationFrame(tick);
    }
    function tick() {
      // Lerp toward target so movement is buttery, not jittery.
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      node!.style.setProperty("--gx", `${currentX}%`);
      node!.style.setProperty("--gy", `${currentY}%`);
      if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    }
    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[5]"
      style={{
        background:
          "radial-gradient(450px 350px at var(--gx, 50%) var(--gy, 30%), rgba(1,145,252,0.16), transparent 70%)",
        transition: reduced ? "none" : "background 90ms linear",
      }}
    />
  );
}
