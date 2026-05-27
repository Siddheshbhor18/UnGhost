"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

interface Props {
  intensity?: "soft" | "vivid";
}

export function ParallaxBackdrop({ intensity = "soft" }: Props) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();

  // Parallax depths — each blob translates at a different rate.
  const y1 = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -260]);
  const y3 = useTransform(scrollYProgress, [0, 1], [0, -180]);
  const y4 = useTransform(scrollYProgress, [0, 1], [0, -340]);

  const baseOpacity = intensity === "vivid" ? 0.55 : 0.35;

  const blobBase: React.CSSProperties = {
    position: "absolute",
    borderRadius: "9999px",
    filter: "blur(80px)",
    willChange: "transform",
    pointerEvents: "none",
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
      <motion.div
        style={{
          ...blobBase,
          top: "-15%",
          left: "-10%",
          width: "55vw",
          height: "55vw",
          background: "#C5E2FD",
          opacity: baseOpacity,
          y: y1,
        }}
        className="animate-blob-drift"
      />
      <motion.div
        style={{
          ...blobBase,
          top: "10%",
          right: "-15%",
          width: "50vw",
          height: "50vw",
          background: "#E8E5DF",
          opacity: baseOpacity,
          y: y2,
        }}
        className="animate-blob-drift-slow"
      />
      <motion.div
        style={{
          ...blobBase,
          bottom: "-10%",
          left: "20%",
          width: "60vw",
          height: "60vw",
          background: "#9DCEFB",
          opacity: baseOpacity * 0.9,
          y: y3,
        }}
        className="animate-blob-drift"
      />
      <motion.div
        style={{
          ...blobBase,
          bottom: "20%",
          right: "10%",
          width: "40vw",
          height: "40vw",
          background: "#7FB8F5",
          opacity: baseOpacity * 0.5,
          y: y4,
        }}
        className="animate-blob-drift-slow"
      />
    </div>
  );
}
