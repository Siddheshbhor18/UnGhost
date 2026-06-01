/**
 * Per-IP rate limiter — fixed-window counter on top of the shared Redis
 * client. Lightweight on purpose; no `@upstash/ratelimit` dep needed.
 *
 * Usage:
 *
 *   const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
 *   const limit = await enforceRateLimit({ key: `enroll:${ip}`, max: 5, windowSec: 60 });
 *   if (!limit.ok) {
 *     return NextResponse.json({ error: "Too many requests" }, {
 *       status: 429,
 *       headers: {
 *         "Retry-After": String(limit.resetInSec),
 *         "X-RateLimit-Limit": String(5),
 *         "X-RateLimit-Remaining": "0",
 *       },
 *     });
 *   }
 *
 * Why fixed-window not token-bucket: simpler, only needs two Redis calls
 * (INCR + EXPIRE-on-first-hit). At cohort-1 traffic (~50 students) this is
 * way under the precision threshold where bucket-vs-window matters.
 */
import { redis } from "@/server/db/redis";
import { clientIp as trustedClientIp } from "@/server/lib/client-ip";

export interface RateLimitOutcome {
  /** false → request must be blocked with 429. */
  ok: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Seconds until the window resets (Retry-After value). */
  resetInSec: number;
}

export interface RateLimitInput {
  /** Cache key — caller decides namespace (e.g. `enroll:${ip}`). */
  key: string;
  /** Max requests per window. */
  max: number;
  /** Window length in seconds. */
  windowSec: number;
}

export async function enforceRateLimit({
  key,
  max,
  windowSec,
}: RateLimitInput): Promise<RateLimitOutcome> {
  const r = redis();
  // INCR is atomic — race-safe even under concurrent requests from the same IP.
  const count = await r.incr(key);
  if (count === 1) {
    // First request in this window — set the TTL. If EXPIRE races (key
    // already has TTL from another concurrent first-incr), no harm: same
    // TTL is set.
    await r.expire(key, windowSec);
  }
  const ttl = await r.ttl(key);
  const resetInSec = ttl > 0 ? ttl : windowSec;
  if (count > max) {
    return { ok: false, remaining: 0, resetInSec };
  }
  return { ok: true, remaining: max - count, resetInSec };
}

/**
 * Helper to pull the client IP out of standard headers. Falls back to
 * "unknown" so the limiter still works (just keys all anonymous traffic
 * to the same bucket — fail-closed for shared NATs is fine at v1).
 */
export function clientIp(req: Request): string {
  // Delegate to the shared trusted extractor (prefers non-spoofable x-real-ip).
  return trustedClientIp(req, "unknown");
}
