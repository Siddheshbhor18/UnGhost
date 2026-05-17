// AI adapter — swaps mock for Claude when ANTHROPIC_API_KEY is set.
// Type contracts live in shared/ so UI components can import them.
import { mockAdapter } from "./mock";
import { claudeAdapter } from "./claude";
import type { AIAdapter } from "@/shared/types/ai";

export * from "@/shared/types/ai";

export function getAI(): AIAdapter {
  if (process.env.ANTHROPIC_API_KEY) return claudeAdapter;
  return mockAdapter;
}

/** Used by the demo-mode badge component. */
export function aiMode(): "live" | "mock" {
  return process.env.ANTHROPIC_API_KEY ? "live" : "mock";
}
