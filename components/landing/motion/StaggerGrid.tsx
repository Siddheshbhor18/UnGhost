"use client";

import { ReactNode, ElementType } from "react";
import { motion, useReducedMotion, Variants } from "framer-motion";

interface Props {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  stagger?: number;
  delay?: number;
  amount?: number;
}

const containerVariants = (stagger: number, delay: number): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

const childVariants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function StaggerGrid({
  children,
  className,
  as = "div",
  stagger = 0.07,
  delay = 0.05,
  amount = 0.15,
}: Props) {
  const reduce = useReducedMotion();
  const MotionTag = motion(as);

  if (reduce) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag
      className={className}
      variants={containerVariants(stagger, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </MotionTag>
  );
}

/** Wrap each direct child of StaggerGrid in this. */
export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  const reduce = useReducedMotion();
  const MotionTag = motion(as);

  if (reduce) {
    const Tag = as as ElementType;
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <MotionTag className={className} variants={childVariants}>
      {children}
    </MotionTag>
  );
}
