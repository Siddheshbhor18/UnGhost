"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion, animate } from "framer-motion";

interface Props {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  /** Format with locale commas. */
  format?: boolean;
  /** Decimal places. */
  decimals?: number;
}

export function CountUp({
  to,
  duration = 1.6,
  prefix = "",
  suffix = "",
  className,
  format = false,
  decimals = 0,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState<string>(() =>
    reduce ? formatValue(to, format, decimals) : formatValue(0, format, decimals),
  );

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(formatValue(to, format, decimals));
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(formatValue(v, format, decimals)),
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce, format, decimals]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

function formatValue(n: number, useFormat: boolean, decimals: number): string {
  const v = decimals === 0 ? Math.round(n) : Number(n.toFixed(decimals));
  return useFormat ? v.toLocaleString("en-IN") : String(v);
}
