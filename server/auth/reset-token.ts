/**
 * Password-reset token issuance + verification.
 *
 * Tokens are random 32-byte hex strings stored in Redis under
 * `auth:reset:<token> → <userId>` with a 1-hour TTL. Reads are
 * one-shot: a successful verify deletes the token immediately.
 *
 * Replaces the in-memory Map from the prototype phase. Survives restarts
 * and works across horizontally-scaled app instances.
 */
import { randomBytes } from "node:crypto";
import { redis } from "@/server/db/redis";

const RESET_TTL_SEC = 60 * 60; // 1 hour
const RATE_LIMIT_WINDOW_SEC = 60 * 10; // 10 minutes
const RATE_LIMIT_MAX = 5; // max 5 reset requests per email per window

function tokenKey(token: string) {
  return `auth:reset:${token}`;
}
function rateKey(email: string) {
  return `auth:reset:rate:${email.toLowerCase().trim()}`;
}

/** Issue a fresh reset token for `userId`. Returns the token (caller emails it). */
export async function issueResetToken(
  userId: string,
  email: string,
): Promise<{ token: string; rateLimited: boolean }> {
  const r = redis();
  const fails = await r.incr(rateKey(email));
  if (fails === 1) await r.expire(rateKey(email), RATE_LIMIT_WINDOW_SEC);
  if (fails > RATE_LIMIT_MAX) {
    return { token: "", rateLimited: true };
  }
  const token = randomBytes(32).toString("hex");
  await r.set(tokenKey(token), userId, { ex: RESET_TTL_SEC });
  return { token, rateLimited: false };
}

/** Look up the user id for a token without consuming it. */
export async function peekResetToken(token: string): Promise<string | null> {
  if (!token || typeof token !== "string") return null;
  return redis().get(tokenKey(token));
}

/** Consume a reset token. Returns the user id, or null if expired/missing. */
export async function consumeResetToken(token: string): Promise<string | null> {
  if (!token || typeof token !== "string") return null;
  const r = redis();
  const userId = await r.get(tokenKey(token));
  if (!userId) return null;
  await r.del(tokenKey(token));
  return userId;
}
