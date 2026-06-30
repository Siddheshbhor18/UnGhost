import { ROOMS, type BootcampCategory } from "@/shared/rooms";

/**
 * Pure filter used by `<CoursePicker hideInCart />` and verified directly in
 * tests — keeps the picker's "what's actually addable" rule out of the
 * `.tsx` component so a regression there can't sneak in past the unit
 * tests.
 *
 * Behaviour:
 *   - Owned courses are ALWAYS hidden (we never offer to add a course the
 *     buyer already holds — the server price engine would drop it anyway).
 *   - `hideInCart === false` → returns every remaining course.
 *   - `hideInCart === true`  → also drops rooms currently in the cart.
 *   - Before mount, the persisted cart is treated as empty so SSR + first
 *     client render agree (`mounted: false` ⇒ ignore `items`). Owned is
 *     server-rendered so it's safe to apply pre-mount.
 *
 * Lives in a plain `.ts` file (not the parent `.tsx`) so vitest can import
 * it without spinning up a React JSX transform.
 */
export function visiblePickerCourses(
  items: readonly BootcampCategory[],
  hideInCart: boolean,
  mounted: boolean,
  ownedCourses: readonly BootcampCategory[] = [],
): readonly (typeof ROOMS)[number][] {
  const owned = new Set(ownedCourses);
  const base = ROOMS.filter((r) => !owned.has(r.id));
  if (!hideInCart || !mounted) return base;
  return base.filter((r) => !items.includes(r.id));
}
