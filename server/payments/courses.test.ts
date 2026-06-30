/**
 * `coursesPricing` — the order route's price gate. The `ownedCourses`
 * parameter is what stops a buyer (or a tampered client) from being
 * charged a second time for a course they already hold; these tests pin
 * every observable branch.
 */
import { describe, expect, it } from "vitest";
import { coursesPricing } from "@/server/payments/courses";
import {
  COURSE_PRICE_PAISE,
  EVERYTHING_BUNDLE_PAISE,
} from "@/shared/lib/courses";
import { computeTotalPaise } from "@/shared/lib/pricing";
import { GST_PERCENT } from "@/shared/types";
import type { BootcampCategory } from "@/shared/rooms";

function expectedTotal(priceInPaise: number): number {
  return computeTotalPaise({ priceInPaise, gstPercent: GST_PERCENT }).totalInPaise;
}

describe("coursesPricing — no ownedCourses (legacy behaviour preserved)", () => {
  it("one paid anchor costs ₹5,000 + GST", () => {
    const p = coursesPricing(["ai"]);
    expect(p.baseInPaise).toBe(COURSE_PRICE_PAISE);
    expect(p.totalInPaise).toBe(expectedTotal(COURSE_PRICE_PAISE));
  });

  it("all six caps at the Everything bundle price + GST", () => {
    const all: BootcampCategory[] = [
      "ai",
      "gtm",
      "marketing",
      "sales",
      "entrepreneurship",
      "freelancing",
    ];
    const p = coursesPricing(all);
    expect(p.isEverything).toBe(true);
    expect(p.baseInPaise).toBe(EVERYTHING_BUNDLE_PAISE);
    expect(p.totalInPaise).toBe(expectedTotal(EVERYTHING_BUNDLE_PAISE));
  });

  it("drops tampered ids that aren't real courses", () => {
    const p = coursesPricing(["ai", "not-a-course", "junk"]);
    expect(p.baseInPaise).toBe(COURSE_PRICE_PAISE);
  });
});

describe("coursesPricing — ownedCourses filter (defense against re-charge)", () => {
  it("strips owned courses from the cart before pricing", () => {
    // Cart wants AI, but buyer already owns AI → nothing left to charge.
    const p = coursesPricing(["ai"], ["ai"]);
    expect(p.baseInPaise).toBe(0);
    expect(p.totalInPaise).toBe(0);
  });

  it("charges only for the non-owned remainder", () => {
    // Buyer owns AI; cart adds GTM → charge GTM only (₹5k + GST).
    const p = coursesPricing(["ai", "gtm"], ["ai"]);
    expect(p.baseInPaise).toBe(COURSE_PRICE_PAISE);
    expect(p.totalInPaise).toBe(expectedTotal(COURSE_PRICE_PAISE));
  });

  it("owned courses don't break free-unlock math — buying GTM still unlocks the business trio", () => {
    // Buyer owns AI; cart adds GTM → GTM is the paid anchor (₹5k),
    // marketing/sales/entrepreneurship come free via the unlock rule.
    const p = coursesPricing(["gtm"], ["ai"]);
    expect(p.baseInPaise).toBe(COURSE_PRICE_PAISE);
    // The granted set is what the unlock engine returned — not what they
    // already owned — so it reflects only this transaction.
    expect(p.granted.sort()).toEqual(
      ["entrepreneurship", "gtm", "marketing", "sales"].sort(),
    );
  });

  it("buyer who owns everything pays nothing — order route maps this to empty_cart", () => {
    const all: BootcampCategory[] = [
      "ai",
      "gtm",
      "marketing",
      "sales",
      "entrepreneurship",
      "freelancing",
    ];
    const p = coursesPricing(all, all);
    expect(p.baseInPaise).toBe(0);
    expect(p.totalInPaise).toBe(0);
    expect(p.isEverything).toBe(false);
  });

  it("ownedCourses defaulted to [] keeps every existing caller working", () => {
    const withOwned = coursesPricing(["ai"], []);
    const legacy = coursesPricing(["ai"]);
    expect(withOwned.totalInPaise).toBe(legacy.totalInPaise);
    expect(withOwned.baseInPaise).toBe(legacy.baseInPaise);
  });

  it("owned ids that aren't real courses are harmless — sanitize still runs on the cart side", () => {
    const p = coursesPricing(["ai"], ["junk", "ai"] as BootcampCategory[]);
    expect(p.baseInPaise).toBe(0);
  });
});
