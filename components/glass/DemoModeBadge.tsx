import { Sparkles } from "lucide-react";

/**
 * Tiny corner badge showing that AI calls are running against the deterministic
 * mock. Hidden when ANY AI provider is configured (Groq / Gemini / Anthropic).
 *
 * Server component — checks env vars at render time.
 */
export function DemoModeBadge() {
  const hasAnyAI =
    process.env.ANTHROPIC_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;
  if (hasAnyAI) return null;
  return (
    <div className="fixed bottom-3 left-3 z-30 pointer-events-none">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/30 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-md">
        <Sparkles size={10} /> Demo mode · mock AI
      </span>
    </div>
  );
}
