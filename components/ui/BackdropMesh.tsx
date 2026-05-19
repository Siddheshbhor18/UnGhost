import clsx from "clsx";

/**
 * Editorial background mesh — soft brand-toned blobs drifting subtly.
 * Pure CSS, no client features. Stays a server component so hydration
 * costs zero on every page that uses it.
 * Replaces the old `BlobField` with a calmer, design-system-aligned version.
 * Position absolutely behind page content; respects prefers-reduced-motion.
 */
export function BackdropMesh({
  className,
  intensity = "soft",
}: {
  className?: string;
  intensity?: "soft" | "vivid";
}) {
  const opacity = intensity === "vivid" ? 0.55 : 0.35;
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div
        className="blob animate-blob-drift motion-reduce:animate-none"
        style={{
          top: "-10%",
          left: "-5%",
          width: 520,
          height: 520,
          background: "radial-gradient(circle, #C5E2FD 0%, transparent 70%)",
          opacity,
        }}
      />
      <div
        className="blob animate-blob-drift-slow motion-reduce:animate-none"
        style={{
          top: "20%",
          right: "-10%",
          width: 600,
          height: 600,
          background: "radial-gradient(circle, #E8E5DF 0%, transparent 70%)",
          opacity: opacity * 0.8,
        }}
      />
      <div
        className="blob animate-blob-drift motion-reduce:animate-none"
        style={{
          bottom: "-15%",
          left: "35%",
          width: 480,
          height: 480,
          background: "radial-gradient(circle, #9DCEFB 0%, transparent 70%)",
          opacity: opacity * 0.7,
        }}
      />
    </div>
  );
}
