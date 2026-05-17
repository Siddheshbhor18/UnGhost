import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "brand" | "glass" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ variant = "brand", size = "md", fullWidth, className, children, ...rest }, ref) => {
    const base =
      variant === "brand"
        ? "btn-brand"
        : variant === "glass"
        ? "btn-glass"
        : "text-brand-ink hover:text-brand-primary inline-flex items-center gap-2 font-semibold transition";
    const sizing =
      size === "sm" ? "text-sm px-3 py-1.5" : size === "lg" ? "text-base px-6 py-3.5" : "text-sm";
    return (
      <button
        ref={ref}
        className={clsx(base, sizing, fullWidth && "w-full justify-center", className)}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
GlassButton.displayName = "GlassButton";
