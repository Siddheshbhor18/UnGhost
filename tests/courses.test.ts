import { describe, it, expect } from "vitest";
import {
  resolveCart,
  everythingSelection,
  COURSE_PRICE_PAISE,
  EVERYTHING_BUNDLE_PAISE,
} from "@/shared/lib/courses";
import type { BootcampCategory } from "@/shared/rooms";

const set = (xs: BootcampCategory[]) => [...xs].sort();

describe("course bundle engine — resolveCart", () => {
  it("AI unlocks marketing+sales+entrepreneurship (not freelancing/gtm)", () => {
    const r = resolveCart(["ai"]);
    expect(r.paidAnchors).toEqual(["ai"]);
    expect(r.pricePaise).toBe(COURSE_PRICE_PAISE);
    expect(set(r.granted)).toEqual(set(["ai", "marketing", "sales", "entrepreneurship"]));
    expect(r.isEverything).toBe(false);
  });

  it("GTM unlocks the same business trio", () => {
    const r = resolveCart(["gtm"]);
    expect(set(r.granted)).toEqual(set(["gtm", "marketing", "sales", "entrepreneurship"]));
    expect(r.pricePaise).toBe(COURSE_PRICE_PAISE);
  });

  it("buying any one business course grants all four (₹5k)", () => {
    for (const c of ["entrepreneurship", "freelancing", "marketing", "sales"] as const) {
      const r = resolveCart([c]);
      expect(r.pricePaise).toBe(COURSE_PRICE_PAISE);
      expect(set(r.granted)).toEqual(
        set(["entrepreneurship", "freelancing", "marketing", "sales"]),
      );
    }
  });

  it("adding a course already freed by another is not double-charged", () => {
    const r = resolveCart(["ai", "marketing"]); // marketing is free with AI
    expect(r.paidAnchors).toEqual(["ai"]);
    expect(r.pricePaise).toBe(COURSE_PRICE_PAISE);
    expect(set(r.granted)).toEqual(set(["ai", "marketing", "sales", "entrepreneurship"]));
  });

  it("mutually-unlocking business courses never resolve to ₹0", () => {
    const r = resolveCart(["marketing", "freelancing"]);
    expect(r.paidAnchors.length).toBe(1);
    expect(r.pricePaise).toBe(COURSE_PRICE_PAISE);
    expect(set(r.granted)).toEqual(
      set(["entrepreneurship", "freelancing", "marketing", "sales"]),
    );
  });

  it("AI + GTM = 5 courses (missing freelancing) at ₹10k", () => {
    const r = resolveCart(["ai", "gtm"]);
    expect(r.paidAnchors.length).toBe(2);
    expect(r.pricePaise).toBe(2 * COURSE_PRICE_PAISE);
    expect(r.granted).not.toContain("freelancing");
    expect(r.isEverything).toBe(false);
  });

  it("AI + freelancing = 5 courses (missing gtm) at ₹10k", () => {
    const r = resolveCart(["ai", "freelancing"]);
    expect(r.pricePaise).toBe(2 * COURSE_PRICE_PAISE);
    expect(r.granted).not.toContain("gtm");
  });

  it("all six resolves to the Everything bundle price (capped below 3×₹5k)", () => {
    const r = resolveCart(everythingSelection());
    expect(r.isEverything).toBe(true);
    expect(r.pricePaise).toBe(EVERYTHING_BUNDLE_PAISE);
    expect(r.granted.length).toBe(6);
  });

  it("empty cart is free and grants nothing", () => {
    const r = resolveCart([]);
    expect(r.pricePaise).toBe(0);
    expect(r.granted).toEqual([]);
  });
});
