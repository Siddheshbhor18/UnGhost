/**
 * `visiblePickerCourses` — the pure filter behind `<CoursePicker hideInCart />`.
 *
 * The picker drops onto two surfaces with different expectations:
 *   - **Empty cart** (`hideInCart={false}`) — show every course as an addable
 *     option, regardless of what's in localStorage.
 *   - **Populated cart** (`hideInCart={true}`) — show only what isn't already
 *     in the cart, so we never offer an "Add" button for a course they have.
 *
 * The function also has to be SSR-stable: before mount we treat the persisted
 * cart as empty so the server-rendered + first client-rendered output match.
 */
import { describe, expect, it } from "vitest";
import { visiblePickerCourses } from "@/components/courses/pickerFilter";
import { ROOMS, type BootcampCategory } from "@/shared/rooms";

const ALL_IDS = ROOMS.map((r) => r.id);

describe("visiblePickerCourses — picker filter", () => {
  it("returns every course when hideInCart is false", () => {
    expect(visiblePickerCourses([], false, true).map((r) => r.id)).toEqual(
      ALL_IDS,
    );
    expect(
      visiblePickerCourses(["ai", "gtm"], false, true).map((r) => r.id),
    ).toEqual(ALL_IDS);
  });

  it("hides cart members when hideInCart is true (post-mount)", () => {
    const inCart: BootcampCategory[] = ["ai", "marketing"];
    const visible = visiblePickerCourses(inCart, true, true).map((r) => r.id);
    expect(visible).not.toContain("ai");
    expect(visible).not.toContain("marketing");
    expect(visible).toContain("gtm");
    expect(visible.length).toBe(ALL_IDS.length - inCart.length);
  });

  it("returns the full list pre-mount even with cart items — keeps SSR + first paint in sync", () => {
    const visible = visiblePickerCourses(["ai", "gtm", "marketing"], true, false).map(
      (r) => r.id,
    );
    expect(visible).toEqual(ALL_IDS);
  });

  it("returns an empty list once every course is in the cart", () => {
    expect(
      visiblePickerCourses(ALL_IDS, true, true),
    ).toEqual([]);
  });

  it("ignores cart entries that aren't valid course ids — no crash, no over-filter", () => {
    const tampered = ["ai", "not-a-course", "junk"] as BootcampCategory[];
    const visible = visiblePickerCourses(tampered, true, true).map((r) => r.id);
    expect(visible).not.toContain("ai");
    expect(visible.length).toBe(ALL_IDS.length - 1);
  });

  it("preserves the canonical room order so cart UI stays stable", () => {
    const visible = visiblePickerCourses(["gtm"], true, true).map((r) => r.id);
    // ROOMS is the canonical order; filter must not re-sort.
    const expected = ALL_IDS.filter((id) => id !== "gtm");
    expect(visible).toEqual(expected);
  });
});

describe("visiblePickerCourses — owned-courses filter (added in owned-courses fix)", () => {
  it("hides owned courses regardless of mount / hideInCart", () => {
    const owned: BootcampCategory[] = ["ai", "gtm"];
    // Both before AND after mount, both hideInCart modes:
    for (const hideInCart of [true, false]) {
      for (const mounted of [true, false]) {
        const visible = visiblePickerCourses([], hideInCart, mounted, owned).map(
          (r) => r.id,
        );
        expect(visible).not.toContain("ai");
        expect(visible).not.toContain("gtm");
      }
    }
  });

  it("owned filter compounds with cart filter — neither slips through", () => {
    const owned: BootcampCategory[] = ["ai"];
    const cart: BootcampCategory[] = ["marketing"];
    const visible = visiblePickerCourses(cart, true, true, owned).map((r) => r.id);
    expect(visible).not.toContain("ai");        // owned
    expect(visible).not.toContain("marketing"); // in cart
    expect(visible).toContain("gtm");           // free to add
    expect(visible.length).toBe(ALL_IDS.length - 2);
  });

  it("returns an empty list when buyer owns every course", () => {
    expect(visiblePickerCourses([], false, true, ALL_IDS)).toEqual([]);
    expect(visiblePickerCourses(["ai"], true, true, ALL_IDS)).toEqual([]);
  });

  it("missing ownedCourses defaults to empty — backward compatible with old callers", () => {
    const visible = visiblePickerCourses([], false, true).map((r) => r.id);
    expect(visible).toEqual(ALL_IDS);
  });
});
