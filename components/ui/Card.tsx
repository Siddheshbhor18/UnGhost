"use client";

import { forwardRef, type HTMLAttributes } from "react";
import clsx from "clsx";

export type CardSurface = "solid" | "glass" | "glass-heavy" | "glass-tinted";
export type CardElevation = "rest" | "raised" | "floating";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Background treatment. Defaults to solid white per design rules. */
  surface?: CardSurface;
  /** Initial shadow depth. */
  elevation?: CardElevation;
  /** Lift on hover. */
  interactive?: boolean;
  /** Brand-blue selected state. */
  selected?: boolean;
  /** Standard padding. Pass false to opt out. */
  padded?: boolean;
}

/**
 * Canonical card primitive. Default = solid white + elevation/2 (per the
 * editorial design rules). Glass variants are opt-in for the approved
 * floating surfaces only.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    surface = "solid",
    elevation = "rest",
    interactive = false,
    selected = false,
    padded = true,
    className,
    children,
    ...rest
  },
  ref,
) {
  const isGlass = surface !== "solid";
  return (
    <div
      ref={ref}
      className={clsx(
        // Base
        "relative",
        // Surface
        isGlass
          ? surface === "glass-heavy"
            ? "glass-heavy"
            : surface === "glass-tinted"
            ? "glass-tinted"
            : "glass"
          : "bg-neutral-0 rounded-lg",
        // Elevation — only applies to solid surfaces (glass has its own shadow)
        !isGlass &&
          (elevation === "floating"
            ? "shadow-elev-4"
            : elevation === "raised"
            ? "shadow-elev-3"
            : "shadow-elev-2"),
        // Selected — gets brand border + tint
        selected && "border-2 border-brand-500 bg-brand-50",
        // Interactive — hover lift
        interactive &&
          "transition-all duration-fast ease-out-soft hover:-translate-y-0.5 " +
            (isGlass ? "hover:shadow-elev-5" : "hover:shadow-elev-3"),
        // Padding
        padded && "p-5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
