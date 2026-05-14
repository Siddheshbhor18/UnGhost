import { cn } from "@/lib/utils/cn";

type Tone = "green" | "pink" | "blue" | "yellow" | "red" | "purple" | "muted";

const toneClass: Record<Tone, string> = {
  green: "border-neon-green text-neon-green",
  pink: "border-neon-pink text-neon-pink",
  blue: "border-neon-blue text-neon-blue",
  yellow: "border-neon-yellow text-neon-yellow",
  red: "border-neon-red text-neon-red",
  purple: "border-neon-purple text-neon-purple",
  muted: "border-bg-ink text-ink-muted",
};

export function Badge({
  children,
  tone = "blue",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-2 py-[3px] font-mono text-[10px] uppercase tracking-wider",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
