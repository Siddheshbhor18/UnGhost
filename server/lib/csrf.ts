/**
 * Same-origin guard for state-mutating API routes.
 *
 * NextAuth's `/api/auth/*` endpoints have their own double-submit CSRF token
 * (the `__Host-next-auth.csrf-token` cookie + form field).
 * For our other mutation routes — /api/coach, /api/applications, /api/admin/*,
 * /api/live/* — we cheaply prevent CSRF by requiring the request's
 * Origin or Referer header to match the deployed host.
 *
 *   - Browsers always send Origin on cross-site fetches that include credentials.
 *   - Same-site fetches set Origin to the page's origin.
 *   - Server-to-server calls (Inngest webhooks, etc) must bypass via a
 *     shared-secret header (CRON_SECRET / INNGEST_SIGNING_KEY) — not this guard.
 *
 * Returns a NextResponse on failure, null on success.
 */
import { NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set<string>(
  [
    "www.unghost.com",
    "staging.unghost.com",
    "unghost.com",
    process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : null,
    process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).host : null,
    // localhost / dev
    "localhost:3000",
    "localhost:3001",
    "localhost:3002",
    "127.0.0.1:3000",
  ].filter((h): h is string => typeof h === "string"),
);

function hostFromHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

/** Returns null when the origin matches; a 403 response otherwise. */
export function requireSameOrigin(req: Request): NextResponse | null {
  const origin = hostFromHeader(req.headers.get("origin"));
  const referer = hostFromHeader(req.headers.get("referer"));

  // Allow when either header matches an allowed host.
  if (origin && ALLOWED_HOSTS.has(origin)) return null;
  if (referer && ALLOWED_HOSTS.has(referer)) return null;

  // Also allow Cloudflare preview wildcard subdomain (preview-NN.unghost.com).
  if (origin && /^preview-\d+\.unghost\.com$/.test(origin)) return null;
  if (referer && /^preview-\d+\.unghost\.com$/.test(referer)) return null;

  return NextResponse.json({ error: "bad_origin" }, { status: 403 });
}

/** Allow-list a wider set of hosts for testing or scripts. */
export function __addAllowedHost(host: string): void {
  ALLOWED_HOSTS.add(host);
}
