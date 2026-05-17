import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "highlight";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Optional dot indicator before the label. */
  dot?: boolean;
  /** Optional leading icon (use a 12-14px Lucide icon). */
  leadingIcon?: ReactNode;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral:  "badge-neutral",
  info:     "badge-info",
  success:  "badge-success",
  warning:  "badge-warning",
  error:    "badge-error",
  highlight:"badge-highlight",
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { tone = "neutral", size = "sm", dot, leadingIcon, className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={clsx("badge", size === "md" && "badge-md", TONE_CLASS[tone], className)}
      {...rest}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {leadingIcon}
      {children}
    </span>
  );
});

export type Tier = "A" | "B" | "C" | "D";

/** Tier badge — communicates match quality, not state. */
export function TierBadge({
  tier,
  size = "md",
  className,
}: {
  tier: Tier;
  size?: BadgeSize;
  className?: string;
}) {
  const tierClass = `badge-tier-${tier.toLowerCase()}`;
  return (
    <span
      className={clsx(
        "badge",
        size === "md" && "badge-md",
        tierClass,
        "font-display font-bold tracking-wide",
        className,
      )}
      aria-label={`Tier ${tier}`}
    >
      {tier}
    </span>
  );
}

export interface ChipProps extends HTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** Removable chip — pass an onRemove handler to show an X. */
  onRemove?: () => void;
  leadingIcon?: ReactNode;
}

/** Filter / category chip. Interactive — use Badge for read-only labels. */
export function Chip({
  active,
  onRemove,
  leadingIcon,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={clsx("chip", active && "chip-active", className)}
      {...rest}
    >
      {leadingIcon}
      {children}
      {onRemove && (
        <span
          role="button"
          tabIndex={0}
          aria-label="Remove filter"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
          className="ml-1 -mr-1 grid place-items-center w-4 h-4 rounded-full hover:bg-black/10 transition"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
      )}
    </button>
  );
}
