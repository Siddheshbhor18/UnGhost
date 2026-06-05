import { describe, it, expect } from "vitest";
import { resolveSkillIds, recordPendingSkill } from "./skill-resolve";
import { SkillModel, PendingSkillModel } from "@/server/db/models";
import type { AIAdapter } from "@/shared/types/ai";

// Identity adapter: canonical == raw (the resolver normalizes on top).
const identity = {
  canonicalizeSkills: async (skills: string[]) =>
    skills.map((s) => ({ raw: s, canonical: s })),
} as unknown as AIAdapter;

async function seedTaxonomy() {
  await SkillModel.create({
    _id: "react",
    canonicalName: "React",
    aliases: ["reactjs"],
    source: "test",
  });
  await SkillModel.create({
    _id: "postgresql",
    canonicalName: "PostgreSQL",
    aliases: ["postgres"],
    source: "test",
  });
}

describe("resolveSkillIds", () => {
  it("maps a taxonomy skill (via the .js normalize floor) to its key", async () => {
    await seedTaxonomy();
    const ids = await resolveSkillIds(["React.js"], identity);
    expect(ids).toEqual(["react"]);
  });

  it("folds an alias onto the canonical key", async () => {
    await seedTaxonomy();
    // "Postgres" normalizes to "postgres", which is an alias of "postgresql"
    const ids = await resolveSkillIds(["Postgres"], identity);
    expect(ids).toEqual(["postgresql"]);
  });

  it("dedups and preserves a not-in-taxonomy skill as a provisional id", async () => {
    await seedTaxonomy();
    const ids = await resolveSkillIds(["React.js", "React", "Rust"], identity);
    expect(ids).toContain("react");
    expect(ids).toContain("rust"); // provisional — kept so matching still works
    // react.js + react collapse to one
    expect(ids.filter((x) => x === "react")).toHaveLength(1);
  });

  it("returns [] for empty input", async () => {
    expect(await resolveSkillIds([], identity)).toEqual([]);
  });
});

describe("recordPendingSkill", () => {
  it("upserts, increments occurrences, and dedups raw samples", async () => {
    await recordPendingSkill("rust", "Rust");
    await recordPendingSkill("rust", "rust");
    await recordPendingSkill("rust", "Rust"); // dup raw sample
    const doc = await PendingSkillModel.findById("rust").lean();
    expect(doc).toBeTruthy();
    expect(doc!.occurrences).toBe(3);
    expect(doc!.decision).toBe("pending");
    expect(new Set(doc!.rawSamples)).toEqual(new Set(["Rust", "rust"]));
  });
});
