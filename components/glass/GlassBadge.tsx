import type { ReactNode } from "react";
import clsx from "clsx";

export type BadgeTone = "brand" | "success" | "warn" | "danger" | "neutral";

const toneClass: Record<BadgeTone, string> = {
  brand: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  warn: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  danger: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  neutral: "bg-brand-ink/5 text-brand-muted border-brand-ink/10",
};

export function GlassBadge({
  tone = "brand",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
