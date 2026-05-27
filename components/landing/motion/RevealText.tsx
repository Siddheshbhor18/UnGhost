"use client";

import { ReactNode, Fragment } from "react";
import { motion, useReducedMotion, Variants } from "framer-motion";

interface Props {
  /** Array of segments. Strings get word-split. Nodes (e.g. <span>) are treated as one segment. */
  segments: Array<string | ReactNode>;
  className?: string;
  stagger?: number;
  delay?: number;
  /** Trigger on mount (hero) or on view (sections). */
  trigger?: "mount" | "view";
  amount?: number;
  /** "spring" (default) or "tween" easing. */
  motionStyle?: "spring" | "tween";
}

const containerVariants = (stagger: number, delay: number): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

const wordVariantsSpring: Variants = {
  hidden: { opacity: 0, y: "0.6em", rotateX: -45 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { type: "spring", damping: 18, stiffness: 220 },
  },
};

const wordVariantsTween: Variants = {
  hidden: { opacity: 0, y: "0.4em" },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function RevealText({
  segments,
  className,
  stagger = 0.05,
  delay = 0.1,
  trigger = "mount",
  amount = 0.4,
  motionStyle = "spring",
}: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <span className={className}>
        {segments.map((seg, i) => (
          <Fragment key={i}>{seg}</Fragment>
        ))}
      </span>
    );
  }

  const wordVariants =
    motionStyle === "spring" ? wordVariantsSpring : wordVariantsTween;

  const motionProps =
    trigger === "mount"
      ? { initial: "hidden", animate: "visible" }
      : {
          initial: "hidden",
          whileInView: "visible",
          viewport: { once: true, amount },
        };

  // Flatten: turn string segments into arrays of words. Nodes pass through.
  const tokens: Array<{ kind: "word" | "node"; value: ReactNode; key: string }> = [];
  segments.forEach((seg, segIdx) => {
    if (typeof seg === "string") {
      const words = seg.split(/(\s+)/);
      words.forEach((w, wIdx) => {
        if (w.trim().length === 0) {
          tokens.push({ kind: "word", value: w, key: `s${segIdx}-w${wIdx}-ws` });
        } else {
          tokens.push({ kind: "word", value: w, key: `s${segIdx}-w${wIdx}` });
        }
      });
    } else {
      tokens.push({ kind: "node", value: seg, key: `s${segIdx}-node` });
    }
  });

  return (
    <motion.span
      className={className}
      variants={containerVariants(stagger, delay)}
      {...motionProps}
      style={{ display: "inline-block", perspective: 800 }}
    >
      {tokens.map((t) =>
        t.kind === "word" && typeof t.value === "string" && t.value.trim() === "" ? (
          <span key={t.key}>{t.value}</span>
        ) : (
          <motion.span
            key={t.key}
            variants={wordVariants}
            style={{ display: "inline-block", transformOrigin: "50% 100%" }}
          >
            {t.value}
          </motion.span>
        ),
      )}
    </motion.span>
  );
}
