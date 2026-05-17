import { Sparkles } from "lucide-react";

/**
 * Tiny corner badge showing that AI calls are running against the deterministic
 * mock. Hidden when ANTHROPIC_API_KEY is present.
 *
 * Server component — checks the env var at render time.
 */
export function DemoModeBadge() {
  if (process.env.ANTHROPIC_API_KEY) return null;
  return (
    <div className="fixed bottom-3 left-3 z-30 pointer-events-none">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md">
        <Sparkles size={10} /> Demo mode · mock AI
      </span>
    </div>
  );
}
