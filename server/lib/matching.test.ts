import { describe, expect, it } from "vitest";
import { computeMatchPct, computeMatchScore, skillDelta, depthScore } from "./matching";

describe("matching", () => {
  describe("computeMatchPct", () => {
    it("returns 0 if job requires no skills", () => {
      expect(computeMatchPct(["react"], [])).toBe(0);
    });

    it("is exact skill coverage with no random jitter", () => {
      // 2 of 3 job skills covered → exactly 67, deterministic.
      expect(computeMatchPct(["react", "node"], ["react", "node", "typescript"])).toBe(67);
      expect(computeMatchPct(["react", "node"], ["react", "node", "typescript"])).toBe(67);
    });
  });

  describe("computeMatchScore (multi-factor)", () => {
    const remoteJob = {
      skills: ["react", "node"],
      experienceMin: 1,
      experienceMax: 3,
      remote: "remote" as const,
    };

    it("scores a perfect verified + in-range + remote match at 100", () => {
      const p = {
        skills: ["react", "node"],
        verifiedSkills: ["react", "node"],
        yearsExperience: 2,
        remotePref: "remote" as const,
      };
      expect(computeMatchScore(p, remoteJob)).toBe(100);
    });

    it("weights verified skills above merely-claimed ones", () => {
      const claimed = computeMatchScore({ skills: ["react"] }, { skills: ["react"], remote: "remote" });
      const verified = computeMatchScore(
        { skills: ["react"], verifiedSkills: ["react"] },
        { skills: ["react"], remote: "remote" },
      );
      expect(verified).toBeGreaterThan(claimed);
    });

    it("penalizes an under-experienced candidate", () => {
      const fresher = computeMatchScore(
        { skills: ["react", "node"], verifiedSkills: ["react", "node"], yearsExperience: 0 },
        { ...remoteJob, experienceMin: 5, experienceMax: 8 },
      );
      const senior = computeMatchScore(
        { skills: ["react", "node"], verifiedSkills: ["react", "node"], yearsExperience: 6 },
        { ...remoteJob, experienceMin: 5, experienceMax: 8 },
      );
      expect(senior).toBeGreaterThan(fresher);
    });

    it("penalizes a remote-only candidate for an onsite job", () => {
      const onsite = computeMatchScore(
        { skills: ["react", "node"], verifiedSkills: ["react", "node"], remotePref: "remote" },
        { skills: ["react", "node"], remote: "onsite", location: "Mumbai" },
      );
      const remote = computeMatchScore(
        { skills: ["react", "node"], verifiedSkills: ["react", "node"], remotePref: "remote" },
        remoteJob,
      );
      expect(remote).toBeGreaterThan(onsite);
    });

    it("is deterministic and 0 when the job lists no skills", () => {
      const p = { skills: ["react"] };
      expect(computeMatchScore(p, { skills: [] })).toBe(0);
      expect(computeMatchScore(p, remoteJob)).toBe(computeMatchScore(p, remoteJob));
    });
  });

  describe("skillDelta", () => {
    it("maps skills matching status correctly", () => {
      const delta = skillDelta(["react"], ["react", "node"]);
      expect(delta).toEqual([
        { skill: "react", has: true },
        { skill: "node", has: false }
      ]);
    });
  });

  describe("depthScore", () => {
    it("calculates a score for answer texts", () => {
      const score = depthScore("This is a simple answer without many sentences or details.");
      expect(score).toBeGreaterThan(0);
    });

    it("rewards evidence words in scoring", () => {
      const scoreSimple = depthScore("A simple text.");
      const scoreEvidence = depthScore("Specifically, because of this trade-off, we shipped a rollout regression.");
      expect(scoreEvidence).toBeGreaterThan(scoreSimple);
    });
  });
});
