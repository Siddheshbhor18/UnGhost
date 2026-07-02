/**
 * Shared cron-endpoint auth.
 *
 * Every scheduled endpoint (`/api/cron/*`) accepts two triggers:
 *   1. Vercel Cron / external scheduler → `Authorization: Bearer <CRON_SECRET>`.
 *   2. Admin click → authenticated admin session (rate-limited by the caller).
 *
 * Prior implementations compared the bearer with `===`, which is a string
 * compare that returns early on the first differing byte. Under HTTP that's a
 * narrow but real oracle for the secret — a determined attacker could probe
 * the timing per-byte to reconstruct it. `timingSafeEqual` closes that.
 *
 * We also require both buffers to have identical length before calling the
 * primitive (which is what `timingSafeEqual` itself demands).
 */
import { timingSafeEqual } from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";

/** True when the caller presented the correct cron bearer secret. */
export function hasCronBearer(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (!header) return false;
  const expected = `Bearer ${secret}`;
  // Reject early on length mismatch so `timingSafeEqual` never throws.
  if (header.length !== expected.length) return false;
  const a = Buffer.from(header, "utf8");
  const b = Buffer.from(expected, "utf8");
  return timingSafeEqual(a, b);
}

/**
 * Uniform cron auth: returns `{ ok, bypassRl }`.
 *   - `bypassRl: true` when the caller is the scheduler (skip per-request
 *     rate-limit + same-origin guard — no browser is involved).
 *   - `bypassRl: false` when the caller is an admin session (route MUST still
 *     apply CSRF + rate-limit, mirroring every other admin mutation).
 *
 * `ok: false` → the route returns 403 (or 401 if it prefers).
 */
export async function authoriseCron(
  req: Request,
): Promise<{ ok: boolean; bypassRl: boolean }> {
  if (hasCronBearer(req)) return { ok: true, bypassRl: true };
  const session = await getServerSession(authOptions);
  return {
    ok: session?.user?.role === "admin",
    bypassRl: false,
  };
}
