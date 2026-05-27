"use client";

import { ReactNode, ElementType, CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";

interface Props {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  id?: string;
  delay?: number;
  y?: number;
  amount?: number;
  duration?: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export function MotionSection({
  children,
  as = "section",
  className,
  style,
  id,
  delay = 0,
  y = 24,
  amount = 0.2,
  duration = 0.7,
}: Props) {
  const reduce = useReducedMotion();
  const MotionTag = motion(as);

  if (reduce) {
    const Tag = as as ElementType;
    return (
      <Tag id={id} className={className} style={style}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      id={id}
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration, ease: EASE, delay }}
    >
      {children}
    </MotionTag>
  );
}
