import { describe, it, expect } from "vitest";
import {
  effectivePlan,
  planAllowsCoach,
  ownsCourse,
} from "@/server/lib/quota";
import type { User } from "@/shared/types";

const base = (over: Partial<User>): User => ({ id: "u", email: "", passwordHash: "", role: "student", name: "", ...over }) as User;
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 1000).toISOString();

describe("effectivePlan — new tiers", () => {
  it("free stays free", () => {
    expect(effectivePlan(base({ plan: "free" }))).toBe("free");
    expect(effectivePlan(base({}))).toBe("free");
  });
  it("active jobs plans resolve to themselves", () => {
    expect(effectivePlan(base({ plan: "jobs_quarterly", planExpiresAt: future }))).toBe("jobs_quarterly");
    expect(effectivePlan(base({ plan: "jobs_annual", planExpiresAt: future }))).toBe("jobs_annual");
  });
  it("an expired paid plan lapses to free", () => {
    expect(effectivePlan(base({ plan: "jobs_annual", planExpiresAt: past }))).toBe("free");
    expect(effectivePlan(base({ plan: "premium", planExpiresAt: past }))).toBe("free");
  });
  it("grandfathered premium with no expiry stays premium", () => {
    expect(effectivePlan(base({ plan: "premium" }))).toBe("premium");
  });
});

describe("feature gates", () => {
  it("AI Coach is on for paid jobs plans, off for free", () => {
    expect(planAllowsCoach(base({ plan: "jobs_quarterly", planExpiresAt: future }))).toBe(true);
    expect(planAllowsCoach(base({ plan: "jobs_annual", planExpiresAt: future }))).toBe(true);
    expect(planAllowsCoach(base({ plan: "free" }))).toBe(false);
  });
});

describe("ownsCourse", () => {
  it("grandfathered premium owns every course", () => {
    expect(ownsCourse(base({ plan: "premium" }), "ai")).toBe(true);
    expect(ownsCourse(base({ plan: "premium" }), "freelancing")).toBe(true);
  });
  it("jobs plans do NOT bundle bootcamps — ownership is per-course", () => {
    const u = base({
      plan: "jobs_annual",
      planExpiresAt: future,
      ownedCourses: [{ course: "ai", grantedAt: past, expiresAt: future }],
    });
    expect(ownsCourse(u, "ai")).toBe(true);
    expect(ownsCourse(u, "gtm")).toBe(false);
  });
  it("an expired course grant no longer grants access", () => {
    const u = base({
      plan: "free",
      ownedCourses: [{ course: "marketing", grantedAt: past, expiresAt: past }],
    });
    expect(ownsCourse(u, "marketing")).toBe(false);
  });
  it("free user owns only currently-valid granted courses", () => {
    const u = base({
      plan: "free",
      ownedCourses: [{ course: "marketing", grantedAt: past, expiresAt: future }],
    });
    expect(ownsCourse(u, "marketing")).toBe(true);
    expect(ownsCourse(u, "sales")).toBe(false);
  });
});

import { PLAN_RANK, planAlreadyCovered } from "@/shared/types";

describe("PLAN_RANK + planAlreadyCovered", () => {
  it("ranks tiers in marketing order: free < quarterly < annual < premium", () => {
    expect(PLAN_RANK.free).toBeLessThan(PLAN_RANK.jobs_quarterly);
    expect(PLAN_RANK.jobs_quarterly).toBeLessThan(PLAN_RANK.jobs_annual);
    expect(PLAN_RANK.jobs_annual).toBeLessThan(PLAN_RANK.premium);
  });

  it("returns false when the target is strictly higher (upgrade allowed)", () => {
    expect(planAlreadyCovered("free", "jobs_quarterly")).toBe(false);
    expect(planAlreadyCovered("free", "jobs_annual")).toBe(false);
    expect(planAlreadyCovered("free", "premium")).toBe(false);
    expect(planAlreadyCovered("jobs_quarterly", "jobs_annual")).toBe(false);
    expect(planAlreadyCovered("jobs_quarterly", "premium")).toBe(false);
    expect(planAlreadyCovered("jobs_annual", "premium")).toBe(false);
  });

  it("returns true on same-tier (re-buy / renewal — blocked at order route, allowed at fulfilment)", () => {
    expect(planAlreadyCovered("jobs_quarterly", "jobs_quarterly")).toBe(true);
    expect(planAlreadyCovered("jobs_annual", "jobs_annual")).toBe(true);
    expect(planAlreadyCovered("premium", "premium")).toBe(true);
    expect(planAlreadyCovered("free", "free")).toBe(true);
  });

  it("returns true on downgrade", () => {
    expect(planAlreadyCovered("jobs_annual", "jobs_quarterly")).toBe(true);
    expect(planAlreadyCovered("premium", "jobs_quarterly")).toBe(true);
    expect(planAlreadyCovered("premium", "jobs_annual")).toBe(true);
  });
});
