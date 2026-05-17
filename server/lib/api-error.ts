/**
 * API route error wrapper.
 *
 * Wrap any App Router route handler so that uncaught exceptions are
 * captured to Sentry (with the request id from middleware) and a generic
 * 500 is returned instead of Next's default error page.
 *
 * Usage:
 *   export const POST = withApiErrorTracking(async (req) => { ... });
 *
 * Wrapped handler intentionally does NOT swallow expected NextResponses —
 * if the inner function returns a Response, that's the response.
 */
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { logger } from "@/server/lib/logger";

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response> | Response;

export function withApiErrorTracking<Ctx = unknown>(handler: Handler<Ctx>) {
  return async function wrapped(req: Request, ctx: Ctx): Promise<Response> {
    const requestId =
      req.headers.get("x-request-id") ?? "unknown";
    try {
      return await handler(req, ctx);
    } catch (err) {
      // Don't double-capture — if the inner code already called captureException
      // it'll dedupe via Sentry's event_id. Tag with the request id so traces
      // line up across logger output + Sentry events.
      Sentry.captureException(err, {
        tags: { source: "api", requestId, path: new URL(req.url).pathname },
      });
      logger.error(
        { err: serialiseError(err), requestId, url: req.url },
        "api.unhandled",
      );
      return NextResponse.json(
        { error: "internal_error", requestId },
        { status: 500 },
      );
    }
  };
}

function serialiseError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { value: String(err) };
}
