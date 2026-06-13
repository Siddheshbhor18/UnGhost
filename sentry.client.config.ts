/**
 * Sentry browser-side config. Picks up NEXT_PUBLIC_SENTRY_DSN at build time.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDev = process.env.NODE_ENV !== "production";

if (dsn && !isDev) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    tracesSampleRate: Number(
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
    ),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    integrations: [],
    // Drop non-actionable client noise. These are the visitor's network or
    // browser misbehaving — not bugs in our code — and they were generating
    // false alerts (e.g. a dropped RSC navigation fetch surfaced as
    // "TypeError: network error" on /student/applications — Sentry UNGHOST-3).
    // Real server failures still report from the server SDK, unaffected.
    ignoreErrors: [
      // fetch() failing at the transport layer (offline, connection dropped
      // mid-navigation, DNS hiccup) — varies by browser engine.
      "TypeError: network error",
      "TypeError: Failed to fetch",
      "Failed to fetch",
      "NetworkError when attempting to fetch resource",
      "Network request failed",
      "Load failed",
      "The network connection was lost",
      "The request timed out",
      // Requests the user cancelled by navigating away before they resolved.
      "AbortError",
      "The user aborted a request",
      "signal is aborted without reason",
      // Benign browser noise with no user-visible impact.
      "ResizeObserver loop completed with undelivered notifications",
      "ResizeObserver loop limit exceeded",
    ],
  });
}
