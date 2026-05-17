import { Ghost } from "lucide-react";
import clsx from "clsx";

export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dim = size === "sm" ? "w-8 h-8" : size === "lg" ? "w-14 h-14" : "w-10 h-10";
  const ico = size === "sm" ? 16 : size === "lg" ? 28 : 20;
  const txt = size === "sm" ? "text-base" : size === "lg" ? "text-3xl" : "text-xl";
  return (
    <div className={clsx("inline-flex items-center gap-2.5", className)}>
      <span className={clsx("grid place-items-center rounded-xl bg-brand-gradient text-white shadow-brand-glow", dim)}>
        <Ghost size={ico} />
      </span>
      <span className={clsx("font-display font-bold text-brand-ink", txt)}>
        un<span className="text-brand-gradient">Ghost</span>
      </span>
    </div>
  );
}
