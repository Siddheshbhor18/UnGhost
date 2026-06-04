import { describe, it, expect } from "vitest";
import { canonicalizeSkills } from "./skill-canon";
import { computeMatchPct } from "./matching";
import {
  normalizeSkill,
  isConfusablePair,
  areSkillsEquivalentRaw,
} from "@/shared/skills";
import type { AIAdapter } from "@/shared/types/ai";

// A stub adapter that maps normalized-key → canonical per the given table.
// Anything not in the table is returned unchanged (identity).
function stubAdapter(table: Record<string, string>): AIAdapter {
  return {
    canonicalizeSkills: async (skills: string[]) =>
      skills.map((s) => ({ raw: s, canonical: table[normalizeSkill(s)] ?? s })),
  } as unknown as AIAdapter;
}

function throwingAdapter(): AIAdapter {
  return {
    canonicalizeSkills: async () => {
      throw new Error("llm down");
    },
  } as unknown as AIAdapter;
}

async function equiv(a: string, b: string, adapter: AIAdapter): Promise<boolean> {
  const m = await canonicalizeSkills([a, b], adapter);
  return m.get(a) === m.get(b);
}

describe("normalizeSkill (pure floor)", () => {
  it("trims, collapses whitespace, lowercases", () => {
    expect(normalizeSkill("  Machine   Learning ")).toBe("machine learning");
  });
  it("strips a trailing .js but not .io", () => {
    expect(normalizeSkill("React.JS")).toBe("react");
    expect(normalizeSkill("Node.js")).toBe("node");
    expect(normalizeSkill("socket.io")).toBe("socket.io");
  });
  it("leaves acronyms / symbols intact", () => {
    expect(normalizeSkill("C++")).toBe("c++");
    expect(normalizeSkill("C#")).toBe("c#");
    expect(normalizeSkill("AWS")).toBe("aws");
  });
});

describe("confusable guard (pure)", () => {
  it("flags forbidden pairs", () => {
    expect(isConfusablePair("Java", "JavaScript")).toBe(true);
    expect(isConfusablePair("AWS", "AW")).toBe(true);
    expect(isConfusablePair("CSS", "CS")).toBe(true);
  });
  it("does not flag legitimate equals or unrelated pairs", () => {
    expect(isConfusablePair("React.js", "React")).toBe(false);
    expect(isConfusablePair("Python", "Go")).toBe(false);
  });
  it("areSkillsEquivalentRaw merges variants but never confusables", () => {
    expect(areSkillsEquivalentRaw("React.js", "React")).toBe(true);
    expect(areSkillsEquivalentRaw("Java", "JavaScript")).toBe(false);
  });
});

describe("canonicalizeSkills — POSITIVE merges", () => {
  const POS = stubAdapter({
    postgres: "PostgreSQL",
    postgresql: "PostgreSQL",
    "socket.io": "Socket.IO",
    socketio: "Socket.IO",
  });

  it("merges .js variants via the pure floor (no LLM needed)", async () => {
    expect(await equiv("React.js", "React", POS)).toBe(true);
    expect(await equiv("Node.js", "Node", POS)).toBe(true);
  });
  it("merges synonyms the model maps to one canonical", async () => {
    expect(await equiv("Postgres", "PostgreSQL", POS)).toBe(true);
    expect(await equiv("socket.io", "socketio", POS)).toBe(true);
  });
  it("keeps socket.io distinct from generic socket", async () => {
    expect(await equiv("socket.io", "socket", POS)).toBe(false);
  });
});

describe("canonicalizeSkills — NEGATIVE guardrail (model proposes bad merges)", () => {
  const BAD = stubAdapter({
    java: "JavaScript",
    aws: "AW",
    css: "CS",
    "c#": "C",
    "c++": "C",
  });

  it("refuses Java↔JavaScript even when the model says merge", async () => {
    expect(await equiv("Java", "JavaScript", BAD)).toBe(false);
  });
  it("refuses AWS↔AW, CSS↔CS", async () => {
    expect(await equiv("AWS", "AW", BAD)).toBe(false);
    expect(await equiv("CSS", "CS", BAD)).toBe(false);
  });
  it("refuses C↔C# and C↔C++", async () => {
    expect(await equiv("C#", "C", BAD)).toBe(false);
    expect(await equiv("C++", "C", BAD)).toBe(false);
  });
});

describe("canonicalizeSkills — UNMATCHED + fallback", () => {
  it("treats UNMATCHED as identity (skill kept)", async () => {
    const m = await canonicalizeSkills(["FooBarLib"], stubAdapter({ foobarlib: "UNMATCHED" }));
    expect(m.get("FooBarLib")).toBe("foobarlib");
  });
  it("falls back to normalized identity when the LLM throws (never crashes)", async () => {
    const m = await canonicalizeSkills(["React.js", "Postgres"], throwingAdapter());
    expect(m.get("React.js")).toBe("react");
    expect(m.get("Postgres")).toBe("postgres");
  });
});

describe("end-to-end: canonicalization fixes the false gap", () => {
  it("raises the match score for a variant-form skill", async () => {
    const m = await canonicalizeSkills(
      ["Postgres", "PostgreSQL"],
      stubAdapter({ postgres: "PostgreSQL", postgresql: "PostgreSQL" }),
    );
    const rawScore = computeMatchPct(["Postgres"], ["PostgreSQL"]); // no overlap today
    const fixedScore = computeMatchPct([m.get("Postgres")!], [m.get("PostgreSQL")!]);
    expect(fixedScore).toBeGreaterThan(rawScore);
  });
});
