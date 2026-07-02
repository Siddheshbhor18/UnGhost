/**
 * Email-verification token issuance + consumption.
 *
 *   - 32-byte hex token stored at `auth:emailverify:<token> → <userId>`
 *     with a 24-hour TTL (longer than reset because users defer signup
 *     emails much more often than reset emails).
 *   - One-shot: a successful consume deletes the token.
 *   - Per-user rate limit of 5 issuances / 10 min so a stuck client can't
 *     flood the user's inbox.
 *
 * Wire-up:
 *   - /api/auth/signup issues a token and emails the link.
 *   - /api/auth/resend-email-verify also calls issueEmailVerifyToken.
 *   - /api/auth/verify-email/[token] calls consumeEmailVerifyToken.
 */
import { randomBytes } from "node:crypto";
import { redis } from "@/server/db/redis";

const TTL_SEC = 60 * 60 * 24; // 24h
const RATE_WINDOW_SEC = 60 * 10; // 10 min
const RATE_MAX = 5;

function tokenKey(token: string) {
  return `auth:emailverify:${token}`;
}
function rateKey(userId: string) {
  return `auth:emailverify:rate:${userId}`;
}

export async function issueEmailVerifyToken(
  userId: string,
): Promise<{ token: string; rateLimited: boolean }> {
  const r = redis();
  const fails = await r.incr(rateKey(userId));
  if (fails === 1) await r.expire(rateKey(userId), RATE_WINDOW_SEC);
  if (fails > RATE_MAX) {
    return { token: "", rateLimited: true };
  }
  const token = randomBytes(32).toString("hex");
  await r.set(tokenKey(token), userId, { ex: TTL_SEC });
  return { token, rateLimited: false };
}

export interface ConsumeResult {
  ok: boolean;
  userId?: string;
  reason?: "expired" | "invalid";
}

/**
 * Verify-and-burn atomically. Uses Upstash `getdel` (single Redis round-trip)
 * so two concurrent GET+DEL callers can't both see the value and both delete
 * — a plain get/del split let both consumers report `ok: true` with the same
 * userId, letting a lurking attacker replay a legitimately-clicked verify
 * link within the millisecond window before deletion.
 */
export async function consumeEmailVerifyToken(
  token: string,
): Promise<ConsumeResult> {
  if (!token || token.length < 32) return { ok: false, reason: "invalid" };
  const userId = await redis().getdel(tokenKey(token));
  if (!userId) return { ok: false, reason: "expired" };
  return { ok: true, userId };
}
