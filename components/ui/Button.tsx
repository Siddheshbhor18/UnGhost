"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Optional leading icon node. Auto-sized per button size. */
  leadingIcon?: ReactNode;
  /** Optional trailing icon node. */
  trailingIcon?: ReactNode;
  /** When true the button renders a spinner and is non-interactive. */
  loading?: boolean;
  /** Stretches to fill its container width. */
  fullWidth?: boolean;
}

/**
 * Editorial-grade button — 5 variants × 4 sizes.
 * Driven entirely by the `.btn-*` utility classes defined in globals.css.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    leadingIcon,
    trailingIcon,
    loading,
    fullWidth,
    disabled,
    className,
    children,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-disabled={disabled || loading || undefined}
      aria-busy={loading || undefined}
      className={clsx(
        "btn",
        `btn-${size}`,
        `btn-${variant}`,
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Spinner size={size} />
      ) : (
        <>
          {leadingIcon}
          {children}
          {trailingIcon}
        </>
      )}
    </button>
  );
});

function Spinner({ size }: { size: ButtonSize }) {
  const px = size === "sm" ? 12 : size === "xl" ? 18 : size === "lg" ? 16 : 14;
  return (
    <span
      role="status"
      aria-label="Loading"
      className="inline-block animate-spin"
      style={{
        width: px,
        height: px,
        border: "2px solid currentColor",
        borderRightColor: "transparent",
        borderRadius: "9999px",
        opacity: 0.85,
      }}
    />
  );
}
