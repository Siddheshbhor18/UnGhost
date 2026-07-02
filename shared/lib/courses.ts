/**
 * Bootcamp **course** pricing + bundle engine.
 *
 * A "course" is one of the 6 rooms (shared/rooms.ts). Each course is sold
 * standalone at ₹4,999; buying certain courses unlocks others for free, and
 * owning all 6 is the ₹11,999 "Everything" bundle.
 *
 * Free-unlock rules (one-time, do NOT cascade — only a PAID anchor unlocks):
 *   - Buying AI or GTM      → Marketing, Sales, Entrepreneurship free.
 *   - The business cluster  {Entrepreneurship, Freelancing, Marketing, Sales}:
 *     buying ANY one unlocks the other three free.
 *
 * `resolveCart` is the single source of truth for both what the buyer ends up
 * owning and what they are charged — used by the cart UI (display) and the
 * order route (authoritative price). Pure + deterministic.
 */
import { ROOM_IDS, type BootcampCategory } from "@/shared/rooms";

/** Price of a single course, in paise (₹4,999). */
export const COURSE_PRICE_PAISE = 499_900;

/** Price of the all-6 "Everything" bundle, in paise (₹11,999). */
export const EVERYTHING_BUNDLE_PAISE = 1_199_900;

/** Course access is time-bound: each ₹4,999 purchase grants this many days. */
export const COURSE_DURATION_DAYS = 90;

/** Every sellable course id = every room id. */
export const COURSE_IDS = ROOM_IDS;

/** What each course unlocks FREE when it is a paid anchor. */
export const FREE_WITH: Record<BootcampCategory, readonly BootcampCategory[]> = {
  ai: ["marketing", "sales", "entrepreneurship"],
  gtm: ["marketing", "sales", "entrepreneurship"],
  entrepreneurship: ["freelancing", "marketing", "sales"],
  freelancing: ["entrepreneurship", "marketing", "sales"],
  marketing: ["entrepreneurship", "freelancing", "sales"],
  sales: ["entrepreneurship", "freelancing", "marketing"],
};

/**
 * Anchor-selection priority. Technical courses first (they only unlock the 3
 * business courses, never each other or freelancing), then the business
 * cluster. Guarantees a deterministic, mutual-unlock-safe resolution.
 */
const ANCHOR_ORDER: readonly BootcampCategory[] = [
  "ai",
  "gtm",
  "entrepreneurship",
  "freelancing",
  "marketing",
  "sales",
];

export interface CartResolution {
  /** Every course the buyer will own after purchase (paid + free unlocks). */
  granted: BootcampCategory[];
  /** The courses actually charged for (₹5k each). */
  paidAnchors: BootcampCategory[];
  /** Authoritative total in paise (bundle-capped). */
  pricePaise: number;
  /** True when the resolution grants all 6 courses (bundle price applies). */
  isEverything: boolean;
}

/**
 * Resolve a set of selected courses into { granted, paidAnchors, price }.
 *
 * A selected course is FREE when a higher-priority *paid* selected course
 * unlocks it; otherwise it becomes a paid anchor. The grant set is every paid
 * anchor plus everything those anchors unlock. If the grant covers all 6, the
 * price is capped at the Everything-bundle price.
 */
export function resolveCart(selected: readonly BootcampCategory[]): CartResolution {
  const wanted = new Set(selected);
  const freed = new Set<BootcampCategory>();
  const paidAnchors: BootcampCategory[] = [];

  for (const course of ANCHOR_ORDER) {
    if (!wanted.has(course) || freed.has(course)) continue;
    paidAnchors.push(course);
    for (const unlocked of FREE_WITH[course]) freed.add(unlocked);
  }

  const granted = new Set<BootcampCategory>(paidAnchors);
  for (const anchor of paidAnchors) {
    for (const unlocked of FREE_WITH[anchor]) granted.add(unlocked);
  }

  const isEverything = COURSE_IDS.every((c) => granted.has(c));
  let pricePaise = paidAnchors.length * COURSE_PRICE_PAISE;
  if (isEverything) pricePaise = Math.min(pricePaise, EVERYTHING_BUNDLE_PAISE);

  return {
    granted: [...granted],
    paidAnchors,
    pricePaise,
    isEverything,
  };
}

/** Convenience: the selection representing the Everything bundle (all courses). */
export function everythingSelection(): BootcampCategory[] {
  return [...COURSE_IDS];
}

/** True if `id` is a sellable course id. */
export function isCourseId(id: string): id is BootcampCategory {
  return (COURSE_IDS as readonly string[]).includes(id);
}
