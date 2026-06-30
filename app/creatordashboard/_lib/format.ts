/**
 * Presentation-layer formatters for the creator dashboard. Money is ALWAYS
 * rendered from paise to a ₹ string in the Indian numbering system — raw paise
 * never reach the screen (design rule §5: "Money is never ambiguous").
 */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Paise → "₹1,23,456". Negative balances (post-payout reversals) format as "-₹…". */
export function formatINR(paise: number): string {
  return INR.format(paise / 100);
}

/** ISO timestamp → "27 Jun 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
