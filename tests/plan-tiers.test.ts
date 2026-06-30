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
