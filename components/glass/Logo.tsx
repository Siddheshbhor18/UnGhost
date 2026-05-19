import clsx from "clsx";

export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-14 h-14" : "w-10 h-10";
  const ico = size === "sm" ? 18 : size === "lg" ? 34 : 24;
  const txt = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-xl";
  return (
    <div className={clsx("inline-flex items-center gap-2.5", className)}>
      <span className={clsx("grid place-items-center rounded-xl bg-brand-gradient shadow-brand-glow", dim)}>
        <img
          src="/symbol.svg"
          alt="unGhost"
          width={ico}
          height={ico}
          style={{ filter: "brightness(0) invert(1)" }}
        />
      </span>
      <span className={clsx("font-display font-bold text-brand-ink", txt)}>
        un<span className="text-brand-gradient">Ghost</span>
      </span>
    </div>
  );
}
