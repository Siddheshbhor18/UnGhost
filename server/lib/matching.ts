// Deterministic mock match-% so seeded demos stay consistent.

import { canonicalizeSkills } from "@/server/lib/skill-canon";

export function computeMatchPct(studentSkills: string[], jobSkills: string[]): number {
  if (jobSkills.length === 0) return 0;
  const studentSet = new Set(studentSkills.map((s) => s.toLowerCase()));
  const overlap = jobSkills.filter((s) => studentSet.has(s.toLowerCase())).length;
  // Base score on overlap, then add a tiny stable jitter from the skill list hash for variety.
  const base = (overlap / jobSkills.length) * 100;
  const hash =
    Array.from(jobSkills.concat(studentSkills).join(""))
      .reduce((a, c) => (a + c.charCodeAt(0)) % 17, 0) - 8;
  return Math.max(0, Math.min(100, Math.round(base) + hash));
}

export function skillDelta(studentSkills: string[], jobSkills: string[]) {
  const studentSet = new Set(studentSkills.map((s) => s.toLowerCase()));
  return jobSkills.map((s) => ({
    skill: s,
    has: studentSet.has(s.toLowerCase()),
  }));
}

// ── Canonical-aware variants ──────────────────────────────────────────────
// Same logic as above, but both skill lists are first mapped through the
// cached canonicalizer so format variants ("React.js" vs "React") match.
// The pure fns above are kept intact (deterministic; used by the mock + tests).

export async function computeMatchPctCanon(
  studentSkills: string[],
  jobSkills: string[],
): Promise<number> {
  const map = await canonicalizeSkills([...studentSkills, ...jobSkills]);
  const sc = studentSkills.map((s) => map.get(s) ?? s);
  const jc = jobSkills.map((s) => map.get(s) ?? s);
  return computeMatchPct(sc, jc);
}

export async function skillDeltaCanon(
  studentSkills: string[],
  jobSkills: string[],
): Promise<Array<{ skill: string; has: boolean }>> {
  const map = await canonicalizeSkills([...studentSkills, ...jobSkills]);
  const studentSet = new Set(studentSkills.map((s) => map.get(s) ?? s));
  // `skill` keeps the original job string for display; `has` uses the canonical.
  return jobSkills.map((s) => ({ skill: s, has: studentSet.has(map.get(s) ?? s) }));
}

export function depthScore(text: string): number {
  // Heuristic: length + sentence count + presence of evidence words.
  const len = text.trim().length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 8).length;
  const evidenceWords = [
    "because",
    "specifically",
    "trade-off",
    "tradeoff",
    "metric",
    "shipped",
    "measured",
    "experiment",
    "first",
    "second",
    "step",
    "rollout",
    "shadow",
    "regression",
    "p99",
    "latency",
    "users",
  ];
  const hits = evidenceWords.reduce(
    (acc, w) =>
      acc + (text.toLowerCase().includes(w) ? 1 : 0),
    0,
  );
  const raw = Math.min(100, len / 8 + sentences * 4 + hits * 5);
  return Math.round(raw);
}
