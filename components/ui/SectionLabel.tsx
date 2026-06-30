import clsx from "clsx";
import type { HTMLAttributes, ReactNode } from "react";

export interface SectionLabelProps extends HTMLAttributes<HTMLSpanElement> {
  icon?: ReactNode;
  tone?: "neutral" | "brand" | "muted" | "success";
}

/**
 * Editorial section label — all-caps tracking-wide kicker. Use above an H1
 * or H2 to introduce a section. Pair with an optional Lucide icon.
 */
export function SectionLabel({
  icon,
  tone = "neutral",
  className,
  children,
  ...rest
}: SectionLabelProps) {
  return (
    <span
      className={clsx(
        "section-label inline-flex items-center gap-1.5",
        tone === "brand" && "text-brand-500",
        tone === "muted" && "text-neutral-500",
        tone === "success" && "text-success",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  );
}
