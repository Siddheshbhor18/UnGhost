/**
 * Idempotency-Key support — Stripe-style.
 *
 * Client generates a UUID, sends `Idempotency-Key: <uuid>` header on a
 * mutating request. Server stores `(scope, userId, key) → resultJSON` for
 * 24h. Retries with the same key return the original result instead of
 * creating a second resource.
 *
 * Two functions:
 *   • `getIdempotentResult` — quick read at request start. Return early
 *     with the stored result if a hit.
 *   • `storeIdempotentResult` — write at request end, after the resource
 *     is created. Best-effort; failure here is non-fatal (the resource
 *     was already created; the client just won't get a free retry).
 *
 * Why scope: prevents collisions across endpoints (`enroll`, `purchase`,
 * etc.) if a client reuses keys.
 */
import { redis } from "@/server/db/redis";

const TTL_SECONDS = 24 * 60 * 60;

function key(scope: string, userId: string, idempotencyKey: string): string {
  return `idem:${scope}:${userId}:${idempotencyKey}`;
}

export async function getIdempotentResult<T>(
  scope: string,
  userId: string,
  idempotencyKey: string | null,
): Promise<T | null> {
  if (!idempotencyKey) return null;
  const raw = await redis().get(key(scope, userId, idempotencyKey));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function storeIdempotentResult(
  scope: string,
  userId: string,
  idempotencyKey: string | null,
  result: unknown,
): Promise<void> {
  if (!idempotencyKey) return;
  try {
    await redis().set(
      key(scope, userId, idempotencyKey),
      JSON.stringify(result),
      { ex: TTL_SECONDS },
    );
  } catch {
    /* non-fatal — resource already created */
  }
}

/**
 * Read the header value safely. Header is optional (clients without retry
 * logic just don't send it). Length-bounded so a malicious client can't
 * blow up our cache key namespace with a 10 KB UUID.
 */
export function readIdempotencyKey(req: Request): string | null {
  const v = req.headers.get("idempotency-key");
  if (!v) return null;
  if (v.length > 128) return null;
  // Allow UUIDs + any URL-safe chars. Reject anything weird.
  if (!/^[A-Za-z0-9_.\-:]+$/.test(v)) return null;
  return v;
}
