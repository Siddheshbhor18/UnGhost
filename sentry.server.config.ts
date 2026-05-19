/**
 * Sentry server-side config. Loaded automatically by @sentry/nextjs at
 * server start. Skips initialisation when SENTRY_DSN is not set so dev
 * environments stay quiet.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV !== "production";

if (dsn && !isDev) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    // Performance — capture 20% of transactions; tune in prod via env.
    // Force 0 in dev (even if DSN set) so local request latency stays clean.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.2"),
    // Capture all uncaught errors.
    sampleRate: 1.0,
    // Strip PII from default Sentry breadcrumbs — auth cookies, body fields.
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }
      return event;
    },
  });
}
