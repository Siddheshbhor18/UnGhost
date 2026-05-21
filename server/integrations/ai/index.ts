// AI adapter — swaps mock for a real LLM when an API key is set.
//
// Provider priority (first match wins). The chosen adapter handles its
// OWN per-method fallback internally (each method try/catches and calls
// the next provider in the chain), so this picker only decides the
// *primary* path. The actual runtime chain is:
//
//   Groq  → Gemini → Anthropic → Mock
//
//   1. GROQ_API_KEY           → Groq llama-3.1-8b-instant (low latency)
//   2. GOOGLE_AI_API_KEY      → Gemini 2.5 Flash (stricter JSON schema)
//   3. ANTHROPIC_API_KEY      → Claude Haiku 4.5 (secondary fallback)
//   4. none                   → deterministic mock (offline dev)
//
// Type contracts live in shared/ so UI components can import them.
import { mockAdapter } from "./mock";
import { claudeAdapter } from "./claude";
import { geminiAdapter } from "./gemini";
import { groqAdapter } from "./groq";
import type { AIAdapter } from "@/shared/types/ai";

export * from "@/shared/types/ai";

export function getAI(): AIAdapter {
  if (process.env.GROQ_API_KEY) return groqAdapter;
  if (process.env.GOOGLE_AI_API_KEY) return geminiAdapter;
  if (process.env.ANTHROPIC_API_KEY) return claudeAdapter;
  return mockAdapter;
}

/** Used by the demo-mode badge component + /admin/integrations dashboard. */
export function aiMode(): "live" | "mock" {
  return process.env.GROQ_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.ANTHROPIC_API_KEY
    ? "live"
    : "mock";
}

/**
 * Human-readable provider name. Surfaced in admin dashboards so an operator
 * can tell at a glance which vendor is serving inference. Reports the
 * *primary* — per-method fallbacks aren't surfaced here.
 */
export function aiProvider(): "groq" | "gemini" | "anthropic" | "mock" {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GOOGLE_AI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "mock";
}
