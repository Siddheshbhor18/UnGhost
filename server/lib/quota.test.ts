import { describe, expect, it } from "vitest";
import { effectivePlan } from "./quota";

const DAY = 24 * 60 * 60 * 1000;

describe("effectivePlan", () => {
  it("treats a non-premium user as free", () => {
    expect(effectivePlan({ plan: "free" })).toBe("free");
    expect(effectivePlan({})).toBe("free");
  });

  it("grandfathers a lifetime premium user (no expiry) as premium", () => {
    expect(
      effectivePlan({ plan: "premium", planType: "lifetime" }),
    ).toBe("premium");
  });

  it("keeps annual premium active before expiry", () => {
    const future = new Date(Date.now() + 30 * DAY).toISOString();
    expect(
      effectivePlan({ plan: "premium", planType: "annual", planExpiresAt: future }),
    ).toBe("premium");
  });

  it("downgrades an expired annual premium to free", () => {
    const past = new Date(Date.now() - DAY).toISOString();
    expect(
      effectivePlan({ plan: "premium", planType: "annual", planExpiresAt: past }),
    ).toBe("free");
  });

  it("downgrades exactly at the expiry instant", () => {
    const justNow = new Date(Date.now() - 1).toISOString();
    expect(
      effectivePlan({ plan: "premium", planExpiresAt: justNow }),
    ).toBe("free");
  });
});
