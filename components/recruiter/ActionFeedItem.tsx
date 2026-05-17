import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";

export type Severity = "critical" | "warn" | "info" | "success";

interface Props {
  severity: Severity;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  href: string;
  cta?: string;
}

const SEV: Record<Severity, { border: string; iconBg: string; iconText: string }> = {
  critical: {
    border: "border-l-rose-500",
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-600",
  },
  warn: {
    border: "border-l-amber-500",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-600",
  },
  info: {
    border: "border-l-brand-primary",
    iconBg: "bg-brand-primary/10",
    iconText: "text-brand-primary",
  },
  success: {
    border: "border-l-emerald-500",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-600",
  },
};

export function ActionFeedItem({
  severity,
  icon,
  title,
  subtitle,
  meta,
  href,
  cta = "Review",
}: Props) {
  const s = SEV[severity];
  return (
    <Link
      href={href}
      className={clsx(
        "block rounded-2xl bg-white/55 backdrop-blur-xl border border-white/60 shadow-glass p-4 border-l-4 transition hover:-translate-y-0.5 hover:shadow-glass-hover",
        s.border,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={clsx(
            "grid place-items-center w-10 h-10 rounded-xl shrink-0",
            s.iconBg,
            s.iconText,
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm text-brand-ink line-clamp-1">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-brand-muted line-clamp-1 mt-0.5">
              {subtitle}
            </p>
          )}
          {meta && (
            <p className="text-[11px] text-brand-muted/80 mt-1 font-mono">{meta}</p>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-brand-primary shrink-0">
          {cta}
          <ChevronRight size={12} />
        </div>
      </div>
    </Link>
  );
}
