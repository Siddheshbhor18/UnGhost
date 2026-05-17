/**
 * Declarative rate-limit wrapper for App Router route handlers.
 *
 *   export const POST = withRateLimit(
 *     { bucket: "coach", limit: 15, windowSec: 60, by: "user" },
 *     async (req) => { ... },
 *   );
 *
 * `by: "user"` keys the bucket on the authenticated session id and falls
 * back to ip if there is no session. `by: "ip"` always keys on ip.
 *
 * Compose with `withApiErrorTracking` from server/lib/api-error.ts so
 * uncaught errors inside the handler still ship to Sentry:
 *
 *   export const POST = withRateLimit(opts, withApiErrorTracking(handler));
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  identifierFromRequest,
  rateLimit,
  rateLimitResponse,
  type RateLimitOptions,
} from "@/server/lib/rate-limit";

export interface WithRateLimitOptions extends RateLimitOptions {
  bucket: string;
  /** "user" — prefers session id, falls back to ip. "ip" — always ip. */
  by?: "user" | "ip";
}

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response> | Response;

export function withRateLimit<Ctx = unknown>(
  opts: WithRateLimitOptions,
  handler: Handler<Ctx>,
): Handler<Ctx> {
  return async function wrapped(req, ctx) {
    let identifier: string;
    if (opts.by === "user" || opts.by === undefined) {
      const session = await getServerSession(authOptions).catch(() => null);
      identifier = identifierFromRequest(req, session?.user?.id);
    } else {
      identifier = identifierFromRequest(req);
    }

    const rl = await rateLimit(opts.bucket, identifier, {
      limit: opts.limit,
      windowSec: opts.windowSec,
    });
    if (!rl.allowed) return rateLimitResponse(rl);
    return handler(req, ctx);
  };
}
