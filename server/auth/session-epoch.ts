/**
 * Session-revocation epoch.
 *
 * Every issued JWT embeds the user's `sessionEpoch` at mint time. Bumping the
 * epoch (on ban / suspend / password reset) invalidates every token minted
 * before the bump: edge middleware compares the token's epoch against the
 * stored one and forces re-auth on a mismatch.
 *
 * Redis is the authoritative store for the EDGE check (Mongo isn't reachable
 * from middleware). The key is persistent (no TTL) so a ban survives as long
 * as Redis does. We mirror the value into Mongo for durability + admin
 * visibility. If Redis evicts the key it reads back as 0 — fail-open, which
 * only weakens enforcement of *past* bumps on *already-live* tokens; banned
 * users still can't re-authenticate (authorize() blocks them).
 */
import { redis } from "@/server/db/redis";

function epochKey(userId: string): string {
  return `auth:epoch:${userId}`;
}

/** Current revocation epoch for a user (0 if never bumped / evicted). */
export async function getSessionEpoch(userId: string): Promise<number> {
  if (!userId) return 0;
  const v = await redis().get(epochKey(userId));
  const n = v ? Number(v) : 0;
  return Number.isFinite(n) ? n : 0;
}

/** Bump the epoch (revoking all live tokens for this user). Returns the new value. */
export async function bumpSessionEpoch(userId: string): Promise<number> {
  if (!userId) return 0;
  // INCR creates a persistent key (no TTL) — a revocation must not expire.
  return redis().incr(epochKey(userId));
}
