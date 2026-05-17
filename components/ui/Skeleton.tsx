import clsx from "clsx";
import type { HTMLAttributes } from "react";

export type SkeletonShape = "text" | "title" | "avatar" | "card" | "block";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: SkeletonShape;
  /** Text-line variation: percentage width 50-100. Ignored for non-text shapes. */
  width?: string | number;
  /** Override height for "block" shape. */
  height?: string | number;
}

/**
 * Loading skeleton with shimmer animation. Prefer over spinners for pages
 * and lists. Shimmer is GPU-accelerated background-position translate.
 */
export function Skeleton({
  shape = "text",
  width,
  height,
  className,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        "skeleton",
        shape === "text" && "skeleton-text",
        shape === "title" && "skeleton-title",
        shape === "avatar" && "skeleton-avatar",
        shape === "card" && "skeleton-card",
        className,
      )}
      style={{
        width: width !== undefined ? (typeof width === "number" ? `${width}px` : width) : undefined,
        height: height !== undefined ? (typeof height === "number" ? `${height}px` : height) : undefined,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    />
  );
}

/** Convenience: 3-line text block with varied widths. */
export function SkeletonLines({ count = 3, className }: { count?: number; className?: string }) {
  const widths = ["90%", "78%", "65%", "82%", "70%"];
  return (
    <div className={clsx("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} shape="text" width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/** Convenience: card-shaped placeholder used in feeds. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx("rounded-lg bg-neutral-0 shadow-elev-2 p-5", className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton shape="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton shape="text" width="40%" />
          <Skeleton shape="text" width="60%" />
        </div>
      </div>
      <SkeletonLines count={2} />
    </div>
  );
}
