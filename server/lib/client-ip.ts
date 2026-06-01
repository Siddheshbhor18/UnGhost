/**
 * Trusted client-IP extraction.
 *
 * We run behind Vercel's edge proxy (see vercel.json). Vercel sets `x-real-ip`
 * to the actual connecting client IP and OVERWRITES whatever the client tried
 * to send, so it cannot be spoofed. `x-forwarded-for`, by contrast, carries the
 * client-supplied value as its LEFTMOST entry (Vercel appends the real hop to
 * the right) — so trusting `xff[0]` lets an attacker rotate the header on every
 * request and defeat IP-keyed rate limits (login brute-force, signup spam, …).
 *
 * Resolution order:
 *   1. `x-real-ip`               — proxy-set, trusted, non-spoofable.
 *   2. rightmost `x-forwarded-for` hop — the entry added by infra closest to
 *      us; used only when there's no x-real-ip (local dev / non-Vercel).
 *   3. fallback                  — header-less callers bucket together.
 */
export function clientIpFromHeaders(
  realIp: string | null | undefined,
  forwardedFor: string | null | undefined,
  fallback = "anon",
): string {
  const real = realIp?.trim();
  if (real) return real;
  if (forwardedFor) {
    // Take the RIGHTMOST hop — closest to our infra, least attacker-influenced.
    // (Only reached when x-real-ip is absent, i.e. not behind the Vercel proxy.)
    const parts = forwardedFor
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return fallback;
}

/** Convenience for web `Request` callers. */
export function clientIp(req: Request, fallback = "anon"): string {
  return clientIpFromHeaders(
    req.headers.get("x-real-ip"),
    req.headers.get("x-forwarded-for"),
    fallback,
  );
}
