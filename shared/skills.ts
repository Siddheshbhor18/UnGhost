// Pure, framework-free skill-normalization primitives.
//
// Lives in shared/ so BOTH server code (the LLM-backed canonical resolver in
// server/lib/skill-canon.ts) AND client components (e.g. JobsExplorer facet
// dedup) can import it without crossing the component → server eslint boundary.
//
// This file does NO network / LLM / DB work. It is the deterministic floor:
// the cache key, the exact-match comparison, and the fallback used whenever
// the LLM resolver is unavailable. It must never collapse genuinely distinct
// skills — see CONFUSABLE_GUARD.

/**
 * Deterministic normalization for the comparison KEY (never for display).
 * - trim, collapse internal whitespace, lowercase
 * - strip a single trailing ".js" framework suffix: "React.js" → "react",
 *   "Node.js" → "node". We deliberately do NOT strip ".io" or other dotted
 *   suffixes — "socket.io" must stay distinct from generic "socket".
 */
export function normalizeSkill(raw: string): string {
  let s = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (s.endsWith(".js")) s = s.slice(0, -3).trim();
  return s;
}

/**
 * Pairs (compared in normalized form) that must NEVER be merged, even if a
 * model proposes it. This is the hard guardrail against the classic
 * embedding/LLM false-positives. Checked AFTER the LLM in the resolver.
 */
export const CONFUSABLE_GUARD: ReadonlyArray<readonly [string, string]> = [
  ["java", "javascript"],
  ["aws", "aw"],
  ["css", "cs"],
  ["c", "c#"],
  ["c", "c++"],
  ["c#", "c++"],
  ["socket", "socket.io"],
  ["go", "google"],
];

/** True if {a,b} (normalized, either order) is a forbidden merge. */
export function isConfusablePair(a: string, b: string): boolean {
  const x = normalizeSkill(a);
  const y = normalizeSkill(b);
  if (x === y) return false;
  return CONFUSABLE_GUARD.some(
    ([p, q]) => (p === x && q === y) || (p === y && q === x),
  );
}

/**
 * Deterministic, LLM-free equality on the normalized floor. Used for client
 * facet de-dupe and as the safe fallback. Never merges a confusable pair.
 */
export function areSkillsEquivalentRaw(a: string, b: string): boolean {
  const x = normalizeSkill(a);
  const y = normalizeSkill(b);
  return x.length > 0 && x === y && !isConfusablePair(a, b);
}
