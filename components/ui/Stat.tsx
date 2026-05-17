import clsx from "clsx";
import type { ReactNode } from "react";
import { Card } from "./Card";

export type StatTone = "brand" | "success" | "warning" | "danger" | "neutral";

export interface StatProps {
  /** Label — small uppercase kicker. */
  label: string;
  /** Headline value — auto tabular-numeral. */
  value: string | number;
  /** Optional supporting line below the value. */
  sub?: string;
  /** Optional icon (top-left corner). */
  icon?: ReactNode;
  /** Optional delta indicator (e.g. "+12%"). */
  trend?: { value: string; positive?: boolean };
  tone?: StatTone;
  className?: string;
}

const TONE: Record<StatTone, string> = {
  brand: "text-brand-500",
  success: "text-success",
  warning: "text-warning",
  danger: "text-error",
  neutral: "text-neutral-900",
};

/** Dashboard KPI card. Uses tabular numerals so columns align. */
export function Stat({
  label,
  value,
  sub,
  icon,
  trend,
  tone = "brand",
  className,
}: StatProps) {
  return (
    <Card padded className={clsx("!p-4", className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={clsx(TONE[tone])}>{icon}</span>
        <span className="section-label">{label}</span>
      </div>
      <p
        className={clsx(
          "font-display font-bold text-2xl tnum tracking-tight",
          TONE[tone],
        )}
      >
        {value}
      </p>
      {sub && <p className="text-body-xs text-neutral-500 mt-1">{sub}</p>}
      {trend && (
        <p
          className={clsx(
            "mt-1 text-body-xs font-semibold tnum",
            trend.positive ? "text-success" : "text-error",
          )}
        >
          {trend.positive ? "▲" : "▼"} {trend.value}
        </p>
      )}
    </Card>
  );
}
