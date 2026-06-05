// Skill-overlap % + a multi-factor match score (skills-first, deterministic).

import { canonicalizeSkills } from "@/server/lib/skill-canon";
import { normalizeSkill } from "@/shared/skills";

/** Pure skill-coverage %: how many of the job's skills the candidate has. */
export function computeMatchPct(studentSkills: string[], jobSkills: string[]): number {
  if (jobSkills.length === 0) return 0;
  const studentSet = new Set(studentSkills.map((s) => s.toLowerCase()));
  const overlap = jobSkills.filter((s) => studentSet.has(s.toLowerCase())).length;
  return Math.round((overlap / jobSkills.length) * 100);
}

// ── Multi-factor match score ──────────────────────────────────────────────
// Blends skill coverage (verified skills weighted higher) with experience and
// location/remote fit, using only data already on the profile + job. Pure and
// deterministic (no random jitter, no LLM in the hot path — skills are matched
// via the pre-resolved canonical map). Weights are tunable; skills-first.

const W_SKILL = 0.65;
const W_EXP = 0.2;
const W_LOC = 0.15;

interface MatchProfile {
  skills?: string[];
  verifiedSkills?: string[];
  yearsExperience?: number;
  remotePref?: "remote" | "hybrid" | "onsite";
  city?: string;
}
interface MatchJob {
  skills: string[];
  experienceMin?: number;
  experienceMax?: number;
  remote?: "remote" | "hybrid" | "onsite";
  location?: string;
}

/** 0..1 — how well the candidate's years fit the job's required range. */
function experienceFit(years: number | undefined, min?: number, max?: number): number {
  const lo = min ?? 0;
  const hi = max ?? 0;
  if (lo === 0 && hi === 0) return 1; // unspecified → don't penalize
  if (years === undefined || years === null) return 0.75; // unknown → benefit of doubt
  if (years >= lo && (hi === 0 || years <= hi)) return 1; // in range
  if (years < lo) return Math.max(0.3, 1 - (lo - years) * 0.2); // under: −0.2/yr, floor 0.3
  return 0.9; // over max → mild overqualified
}

/** 0..1 — location / remote-preference fit. */
function locationFit(
  pref: string | undefined,
  city: string | undefined,
  jobRemote?: string,
  jobLocation?: string,
): number {
  if (jobRemote === "remote") return 1; // anyone can do a remote job
  if (pref === "remote") return 0.4; // wants remote, this job isn't
  if (city && jobLocation && jobLocation.toLowerCase().includes(city.toLowerCase())) {
    return 1; // local to the job
  }
  if (pref && jobRemote && pref === jobRemote) return 1;
  if (jobRemote === "hybrid") return 0.8;
  if (!pref && !city) return 0.6; // unknown → neutral
  return 0.5; // onsite, no local match
}

/**
 * Multi-factor 0..100 match score. `canonMap` (raw→canonical) should be the
 * batch result of canonicalizeSkills() over the page's profile + job skills so
 * matching is variant-robust without a per-call LLM hit.
 */
export function computeMatchScore(
  profile: MatchProfile,
  job: MatchJob,
  canonMap?: Map<string, string>,
): number {
  const canon = (s: string) => canonMap?.get(s) ?? normalizeSkill(s);
  const jobSkills = (job.skills ?? []).map(canon).filter(Boolean);
  if (jobSkills.length === 0) return 0;

  const have = new Set((profile.skills ?? []).map(canon));
  const verified = new Set((profile.verifiedSkills ?? []).map(canon));
  let covered = 0;
  for (const js of jobSkills) {
    if (verified.has(js)) covered += 1; // verified skill — full credit
    else if (have.has(js)) covered += 0.85; // claimed but unverified
  }
  const skillFrac = covered / jobSkills.length;
  const expFrac = experienceFit(profile.yearsExperience, job.experienceMin, job.experienceMax);
  const locFrac = locationFit(profile.remotePref, profile.city, job.remote, job.location);

  const score = (W_SKILL * skillFrac + W_EXP * expFrac + W_LOC * locFrac) * 100;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function skillDelta(studentSkills: string[], jobSkills: string[]) {
  const studentSet = new Set(studentSkills.map((s) => s.toLowerCase()));
  return jobSkills.map((s) => ({
    skill: s,
    has: studentSet.has(s.toLowerCase()),
  }));
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
