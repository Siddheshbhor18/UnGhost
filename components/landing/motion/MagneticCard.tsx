"use client";

import { ReactNode, useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

interface Props {
  children: ReactNode;
  className?: string;
  /** Max translate in px. */
  strength?: number;
  /** Scale on hover. */
  scale?: number;
}

export function MagneticCard({
  children,
  className,
  strength = 6,
  scale = 1.015,
}: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const springConfig = { stiffness: 220, damping: 20, mass: 0.5 };
  const x = useSpring(mx, springConfig);
  const y = useSpring(my, springConfig);
  const hoverScale = useMotionValue(1);
  const sScale = useSpring(hoverScale, springConfig);
  const rotateX = useTransform(y, [-strength, strength], [3, -3]);
  const rotateY = useTransform(x, [-strength, strength], [-3, 3]);

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(px * strength * 2);
    my.set(py * strength * 2);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
    hoverScale.set(1);
  }

  function onEnter() {
    hoverScale.set(scale);
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerEnter={onEnter}
      style={{ x, y, scale: sScale, rotateX, rotateY, transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}
