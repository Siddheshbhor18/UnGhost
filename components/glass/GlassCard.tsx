import { forwardRef, type HTMLAttributes } from "react";
import clsx from "clsx";

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "strong";
  interactive?: boolean;
  glow?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ variant = "default", interactive = false, glow = false, className, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          variant === "strong" ? "glass-panel-strong" : "glass-panel",
          "p-6",
          interactive &&
            "transition duration-200 hover:-translate-y-0.5 hover:shadow-glass-hover cursor-pointer",
          glow && "ring-1 ring-brand-primary/30",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
GlassCard.displayName = "GlassCard";
