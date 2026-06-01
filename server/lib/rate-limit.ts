/**
 * Sliding-window rate limiter backed by Redis.
 *
 * Each call increments a counter at `rl:<bucket>:<identifier>` with a TTL
 * equal to the window length. When the counter exceeds `limit`, further
 * calls return `{ allowed: false }` until the window expires.
 *
 * The first call seeds the TTL (incr semantics). Subsequent calls within
 * the window just bump the counter, which means the window slides forward
 * on the first hit — good enough for cost-DOS prevention without the
 * complexity of a true rolling-window algorithm.
 *
 * Usage in a route:
 *
 *   const rl = await rateLimit("coach", session.user.id, { limit: 15, windowSec: 60 });
 *   if (!rl.allowed) return rateLimitResponse(rl);
 */
import { NextResponse } from "next/server";
import { redis } from "@/server/db/redis";
import { clientIp } from "@/server/lib/client-ip";

export interface RateLimitOptions {
  /** Number of requests allowed in the window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSec: number;
}

export async function rateLimit(
  bucket: string,
  identifier: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const r = redis();
  const key = `rl:${bucket}:${identifier}`;
  const used = await r.incr(key);
  if (used === 1) await r.expire(key, opts.windowSec);
  const ttl = await r.ttl(key);
  const remaining = Math.max(0, opts.limit - used);
  const allowed = used <= opts.limit;
  return {
    allowed,
    limit: opts.limit,
    remaining,
    retryAfterSec: ttl > 0 ? ttl : opts.windowSec,
  };
}

/** Standard 429 response builder with RFC-friendly headers. */
export function rateLimitResponse(r: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "rate_limited", retryAfter: r.retryAfterSec },
    {
      status: 429,
      headers: {
        "retry-after": String(r.retryAfterSec),
        "x-ratelimit-limit": String(r.limit),
        "x-ratelimit-remaining": String(r.remaining),
      },
    },
  );
}

/** Identifier helpers — pick the strongest available. */
export function identifierFromRequest(
  req: Request,
  userId?: string,
): string {
  if (userId) return `u:${userId}`;
  // Trusted IP only — prefers the proxy-set, non-spoofable x-real-ip so a
  // client can't rotate x-forwarded-for to escape an IP-keyed bucket.
  return `ip:${clientIp(req)}`;
}
