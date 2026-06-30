"use client";

import { useReducedMotion } from "framer-motion";

interface Props {
  intensity?: "soft" | "vivid";
}

export function ParallaxBackdrop({ intensity = "soft" }: Props) {
  const reduce = useReducedMotion();

  const baseOpacity = intensity === "vivid" ? 0.35 : 0.2;

  const blobBase: React.CSSProperties = {
    position: "absolute",
    borderRadius: "9999px",
    filter: "blur(60px)",
    pointerEvents: "none",
    transform: "translateZ(0)",
  };

  if (reduce) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div
          style={{
            ...blobBase,
            top: "-15%",
            left: "-10%",
            width: "55vw",
            height: "55vw",
            background: "#C5E2FD",
            opacity: baseOpacity,
          }}
        />
        <div
          style={{
            ...blobBase,
            top: "10%",
            right: "-15%",
            width: "50vw",
            height: "50vw",
            background: "#E8E5DF",
            opacity: baseOpacity,
          }}
        />
        <div
          style={{
            ...blobBase,
            bottom: "-10%",
            left: "20%",
            width: "60vw",
            height: "60vw",
            background: "#9DCEFB",
            opacity: baseOpacity * 0.9,
          }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        style={{
          ...blobBase,
          top: "-15%",
          left: "-10%",
          width: "40vw",
          height: "40vw",
          background: "#C5E2FD",
          opacity: baseOpacity,
        }}
      />
      <div
        style={{
          ...blobBase,
          top: "10%",
          right: "-15%",
          width: "35vw",
          height: "35vw",
          background: "#E8E5DF",
          opacity: baseOpacity,
        }}
        className="hidden md:block"
      />
      <div
        style={{
          ...blobBase,
          bottom: "-10%",
          left: "20%",
          width: "40vw",
          height: "40vw",
          background: "#9DCEFB",
          opacity: baseOpacity * 0.9,
        }}
        className="hidden lg:block"
      />
    </div>
  );
}
