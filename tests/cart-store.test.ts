/**
 * Cart store contract — pins the behaviour the new add-to-cart surfaces
 * (CoursePicker, AddToCartButton, NavCartButton, RoomCartCTA) rely on. The
 * UI never reads partial state: add is idempotent, toggle is a true flip,
 * setAll filters non-courses, clear resets, and the resolved pricing always
 * tracks the cart's current items.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCourseCart } from "@/components/courses/cartStore";
import {
  resolveCart,
  everythingSelection,
  COURSE_PRICE_PAISE,
  EVERYTHING_BUNDLE_PAISE,
} from "@/shared/lib/courses";
import type { BootcampCategory } from "@/shared/rooms";

// Shim localStorage for node — the persist middleware probes it on every set.
beforeEach(() => {
  if (typeof globalThis.localStorage === "undefined") {
    const memory = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => void memory.set(k, v),
      removeItem: (k: string) => void memory.delete(k),
      clear: () => memory.clear(),
      key: (i: number) => Array.from(memory.keys())[i] ?? null,
      get length() {
        return memory.size;
      },
    });
  }
  useCourseCart.getState().clear();
});

describe("course cart store — contract used by every add-to-cart surface", () => {
  it("add is idempotent — clicking 'Add to cart' twice does not duplicate", () => {
    const { add } = useCourseCart.getState();
    add("ai");
    add("ai");
    expect(useCourseCart.getState().items).toEqual(["ai"]);
  });

  it("toggle flips membership both ways", () => {
    const { toggle } = useCourseCart.getState();
    toggle("ai");
    expect(useCourseCart.getState().items).toContain("ai");
    toggle("ai");
    expect(useCourseCart.getState().items).not.toContain("ai");
  });

  it("remove strips a single course without touching the rest", () => {
    const s = useCourseCart.getState();
    s.add("ai");
    s.add("gtm");
    s.remove("ai");
    expect(useCourseCart.getState().items).toEqual(["gtm"]);
  });

  it("setAll keeps only valid course ids — guards against junk in localStorage", () => {
    const { setAll } = useCourseCart.getState();
    setAll(["ai", "not-a-course", "gtm"] as BootcampCategory[]);
    expect(useCourseCart.getState().items.sort()).toEqual(["ai", "gtm"]);
  });

  it("clear empties the cart — used after a successful checkout", () => {
    const s = useCourseCart.getState();
    s.setAll(everythingSelection());
    s.clear();
    expect(useCourseCart.getState().items).toEqual([]);
  });

  it("CartView pricing always matches the store via resolveCart", () => {
    const s = useCourseCart.getState();
    s.add("ai");
    expect(resolveCart(useCourseCart.getState().items).pricePaise).toBe(
      COURSE_PRICE_PAISE,
    );
    s.setAll(everythingSelection());
    expect(resolveCart(useCourseCart.getState().items).pricePaise).toBe(
      EVERYTHING_BUNDLE_PAISE,
    );
  });

  it("NavCartButton count reflects every state transition", () => {
    const s = useCourseCart.getState();
    expect(useCourseCart.getState().items.length).toBe(0);
    s.add("ai");
    expect(useCourseCart.getState().items.length).toBe(1);
    s.add("gtm");
    expect(useCourseCart.getState().items.length).toBe(2);
    s.toggle("ai");
    expect(useCourseCart.getState().items.length).toBe(1);
    s.setAll(everythingSelection());
    expect(useCourseCart.getState().items.length).toBe(6);
  });
});
