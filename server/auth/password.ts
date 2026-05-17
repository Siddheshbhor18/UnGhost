/**
 * Password hashing + verification — bcrypt (12 rounds).
 *
 * Every write of `user.passwordHash` must go through `hashPassword`.
 * Every read-side compare must go through `verifyPassword`.
 * The two helpers also tolerate legacy plaintext seed hashes (length < 30)
 * so dev databases that haven't been re-seeded keep working — those legacy
 * rows will be transparently re-hashed on next successful login.
 */
import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

/** Detect a properly-hashed bcrypt string. */
function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$/.test(value) && value.length >= 60;
}

/** Hash a plaintext password for storage. */
export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("hashPassword: password must be a non-empty string");
  }
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export interface VerifyResult {
  ok: boolean;
  /** True if the stored hash was a legacy plaintext and we should re-hash. */
  shouldRehash: boolean;
}

/** Verify a plaintext password against a stored hash (bcrypt or legacy). */
export async function verifyPassword(
  plain: string,
  storedHash: string,
): Promise<VerifyResult> {
  if (!plain || !storedHash) return { ok: false, shouldRehash: false };
  if (isBcryptHash(storedHash)) {
    const ok = await bcrypt.compare(plain, storedHash);
    return { ok, shouldRehash: false };
  }
  // Legacy plaintext seed compatibility — allow exact match, flag for rehash.
  if (plain === storedHash) {
    return { ok: true, shouldRehash: true };
  }
  return { ok: false, shouldRehash: false };
}

/**
 * Basic password policy — used on signup + reset flows.
 *  - 8+ chars
 *  - one upper, one digit
 *  - <=72 bytes (bcrypt limit)
 */
export function checkPasswordPolicy(plain: string): {
  ok: boolean;
  reason?: string;
} {
  if (plain.length < 8) return { ok: false, reason: "Use at least 8 characters." };
  if (plain.length > 72) return { ok: false, reason: "Password is too long." };
  if (!/[A-Z]/.test(plain)) return { ok: false, reason: "Add an uppercase letter." };
  if (!/\d/.test(plain)) return { ok: false, reason: "Add a number." };
  return { ok: true };
}
