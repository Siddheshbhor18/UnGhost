"use client";

import { useEffect, useState } from "react";

const PARTICLE_COUNT = 8;

/**
 * GhostAnimation — Pure CSS animated ghost character for the hackathon hero.
 *
 * - Floating bob (translateY oscillation, 4s ease-in-out)
 * - Brand-blue glowing eyes with pulse
 * - Particle trail drifting upward
 * - Glass body with backdrop-filter
 * - "Un-ghost" reveal: starts semi-transparent, transitions to solid
 *
 * All keyframes live in globals.css under the `comp-*` prefix.
 * Reduced-motion users see a static ghost with no particles.
 */
export function GhostAnimation(): JSX.Element {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Trigger the "un-ghost" reveal after a short delay
    const timer = setTimeout(() => setRevealed(true), 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="ghost-container ghost-hover-trigger" aria-hidden="true">
      {/* Ambient glow ring */}
      <div className="ghost-glow-ring" />

      {/* Ghost body — glass surface */}
      <div
        className="ghost-body"
        data-reveal={revealed ? "true" : "false"}
        style={{ opacity: revealed ? undefined : 0.15, filter: revealed ? undefined : "blur(6px)" }}
      >
        {/* Eyes */}
        <div className="ghost-eye left" />
        <div className="ghost-eye right" />

        {/* Mouth — subtle smile */}
        <div className="ghost-mouth" />

        {/* Wavy skirt bottom */}
        <div className="ghost-skirt">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>

      {/* Particle trail */}
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
        <div key={i} className="ghost-particle" />
      ))}
    </div>
  );
}
