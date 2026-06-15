/**
 * Pricing helpers — single source of truth for checkout math.
 *
 * Everything is in **paise** (integer 1/100th of a rupee). Floating-point
 * arithmetic on money introduces rounding errors that compound across
 * operations — keep money in integers, convert to rupees only for display.
 *
 *   ₹5,000.00 = 500000 paise
 *   ₹4,999.00 = 499900 paise
 *
 * Lives in `shared/` so both server (authoritative price) and client
 * (display + live coupon recompute in the upgrade UI) import the exact same
 * math. `server/payments/pricing.ts` re-exports this for back-compat.
 *
 * Tests live in `server/payments/pricing.test.ts`. Run with `vitest`.
 */

export interface PricedBootcamp {
  priceInPaise: number;
  gstPercent: number;
}

export interface PriceBreakdown {
  /** Base price before GST, in paise. */
  baseInPaise: number;
  /** GST amount in paise — rounded half-up to nearest paise. */
  gstInPaise: number;
  /** Total charge in paise. baseInPaise + gstInPaise. */
  totalInPaise: number;
}

/**
 * Compute base + GST + total, all in paise. Half-up rounding on GST to
 * match what the UPI app will actually deduct (UPI processes to the paise).
 *
 * Why round here, not at display time: server-side validation compares
 * the submitted UTR amount to `expectedAmountInPaise` — if we round at
 * display we'd compare different numbers, causing false-reject loops.
 */
export function computeTotalPaise(b: PricedBootcamp): PriceBreakdown {
  if (b.priceInPaise < 0 || b.gstPercent < 0) {
    throw new Error("Negative price or GST is not allowed");
  }
  const gstInPaise = Math.round((b.priceInPaise * b.gstPercent) / 100);
  return {
    baseInPaise: b.priceInPaise,
    gstInPaise,
    totalInPaise: b.priceInPaise + gstInPaise,
  };
}

/** Display helper. NEVER use the return value for arithmetic — display only. */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

// ── Coupons ────────────────────────────────────────────────────────────────
// Percent-off codes, matched case-insensitively. Single source of truth so the
// /upgrade UI (display) and the payment APIs (authoritative price) agree.
// No active promo codes — the launch 50%-off offer (unGhost50) has ended, so
// any code submitted resolves to 0% off and the full price is charged. Add an
// entry here to bring a promo back.
const COUPONS: Record<string, number> = {};

/** Percent off for a coupon code (0 if missing/unknown). Case-insensitive. */
export function couponPercentOff(code?: string | null): number {
  if (!code) return 0;
  return COUPONS[code.trim().toLowerCase()] ?? 0;
}

/**
 * Apply a coupon to a base (pre-GST) paise amount. Returns the discounted base
 * + the percent applied (0 = no/invalid coupon). GST is computed on the
 * discounted base by the caller, so a 50%-off coupon halves the total too.
 */
export function applyCoupon(
  basePaise: number,
  code?: string | null,
): { basePaise: number; percentOff: number } {
  const percentOff = couponPercentOff(code);
  return {
    basePaise: Math.round((basePaise * (100 - percentOff)) / 100),
    percentOff,
  };
}

/**
 * Format a paise amount as an INR string with the Indian number system
 * (lakhs/crores grouping). Example: 549900 → "₹5,499".
 *
 * Drops the decimal when the amount is a whole rupee — common for
 * bootcamp pricing where everything ends in `00` paise. Pass
 * `{ withPaise: true }` to force the `.XX` suffix.
 */
export function formatPaiseAsINR(
  paise: number,
  opts: { withPaise?: boolean } = {},
): string {
  const rupees = paiseToRupees(paise);
  const hasFraction = paise % 100 !== 0;
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: opts.withPaise || hasFraction ? 2 : 0,
    maximumFractionDigits: opts.withPaise || hasFraction ? 2 : 0,
  });
  return formatter.format(rupees);
}
