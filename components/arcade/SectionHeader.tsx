import { cn } from "@/shared/lib/cn";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  color?: "pink" | "green" | "blue" | "yellow";
  className?: string;
}

const colorMap = {
  pink: "text-neon-pink",
  green: "text-neon-green",
  blue: "text-neon-blue",
  yellow: "text-neon-yellow",
};

export function SectionHeader({ eyebrow, title, subtitle, color = "pink", className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow && (
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
          <span className={colorMap[color]}>▸</span> {eyebrow}
        </p>
      )}
      <h2 className={cn("font-pixel text-2xl md:text-3xl neon-text", colorMap[color])}>
        {title}
      </h2>
      {subtitle && <p className="text-ink-muted text-sm max-w-2xl">{subtitle}</p>}
    </div>
  );
}
