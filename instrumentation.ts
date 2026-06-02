/**
 * Next.js instrumentation hook — the entry point @sentry/nextjs v8+ uses to
 * initialise server- and edge-runtime error capture. Without this file the
 * root `sentry.server.config.ts` / `sentry.edge.config.ts` are never loaded,
 * so `Sentry.captureException` calls in API routes are silent no-ops and
 * server-side 500s never reach the dashboard.
 *
 * `register()` runs once per runtime at boot; we import the matching config
 * so each runtime gets its own Sentry.init. `onRequestError` forwards
 * uncaught errors from React Server Components / route handlers to Sentry.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
