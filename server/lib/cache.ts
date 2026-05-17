/**
 * Redis read-through cache wrapper.
 *
 * Use for hot, low-cardinality reads — bootcamp catalogue, public mission
 * feed, company profile, dashboard counts. NEVER use for per-user state
 * (sessions, OTPs, drafts) — those should be Redis-native via @/server/db/redis.
 *
 * Usage:
 *
 *   const bootcamps = await cached("bootcamps:published", 300, () =>
 *     BootcampModel.find({ status: "published" }).lean()
 *   );
 *
 * Invalidate on write:
 *
 *   await invalidate("bootcamps:published");
 *
 * Cache misses store the JSON-serialised value. Errors in the wrapper fall
 * through to the loader so the cache is never a single point of failure.
 */
import { redis } from "@/server/db/redis";
import { logger } from "@/server/lib/logger";

const PREFIX = "cache:";

export async function cached<T>(
  key: string,
  ttlSec: number,
  loader: () => Promise<T>,
): Promise<T> {
  const r = redis();
  const k = `${PREFIX}${key}`;
  try {
    const hit = await r.get(k);
    if (hit) {
      return JSON.parse(hit) as T;
    }
  } catch (err) {
    logger.warn({ err, key }, "cache.read-failed");
  }
  const fresh = await loader();
  try {
    await r.set(k, JSON.stringify(fresh), { ex: ttlSec });
  } catch (err) {
    logger.warn({ err, key }, "cache.write-failed");
  }
  return fresh;
}

/** Delete one or more cache entries by exact key. */
export async function invalidate(...keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await redis()
    .del(...keys.map((k) => `${PREFIX}${k}`))
    .catch((err) => logger.warn({ err, keys }, "cache.invalidate-failed"));
}
