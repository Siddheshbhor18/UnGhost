import { describe, expect, it } from "vitest";
import { computeMatchPct, skillDelta, depthScore } from "./matching";

describe("matching", () => {
  describe("computeMatchPct", () => {
    it("returns 0 if job requires no skills", () => {
      expect(computeMatchPct(["react"], [])).toBe(0);
    });

    it("computes matching percentage correctly", () => {
      const pct = computeMatchPct(["react", "node"], ["react", "node", "typescript"]);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
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
