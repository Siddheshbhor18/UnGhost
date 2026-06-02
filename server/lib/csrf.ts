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

/**
 * Parse a host out of an env-supplied URL. Returns null on absent/invalid
 * input instead of throwing — a misconfigured env var (e.g. a bare bucket
 * name pasted into NEXTAUTH_URL) must NOT crash module load and take down
 * the whole build. This runs at import time, so it has to be total.
 */
function hostFromEnv(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

const ALLOWED_HOSTS = new Set<string>(
  [
    // Production domains
    "unghost.in",
    "www.unghost.in",
    // Vercel preview deploys
    "un-ghost.vercel.app",
    // Env-driven (set on Vercel + .env.local)
    hostFromEnv(process.env.NEXT_PUBLIC_APP_URL),
    hostFromEnv(process.env.NEXTAUTH_URL),
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

  // Canonical same-origin check: the request's Origin/Referer matches the very
  // Host it was served on. This is the textbook CSRF defense — a cross-site
  // attacker's Origin never equals the target host — and it transparently
  // covers prod, every Vercel preview deploy, and any custom domain without
  // hardcoding each one. (The static allowlist above stays as a belt-and-
  // suspenders for callers that send Origin but a proxied/rewritten Host.)
  const selfHost = req.headers.get("host");
  if (selfHost) {
    if (origin && origin === selfHost) return null;
    if (referer && referer === selfHost) return null;
  }

  // On Vercel the serverless function's `Host` is often an internal/canonical
  // name while the host the browser actually used arrives in
  // `x-forwarded-host`. Compare against that too so same-origin uploads on a
  // preview alias aren't falsely rejected.
  const fwdHost = req.headers.get("x-forwarded-host");
  if (fwdHost) {
    if (origin && origin === fwdHost) return null;
    if (referer && referer === fwdHost) return null;
  }

  // This project's Vercel preview/prod deploys (un-ghost.vercel.app and every
  // branch alias like un-ghost-git-<branch>-<scope>.vercel.app).
  if (origin && /^un-ghost[a-z0-9-]*\.vercel\.app$/.test(origin)) return null;
  if (referer && /^un-ghost[a-z0-9-]*\.vercel\.app$/.test(referer)) return null;

  // Also allow Cloudflare preview wildcard subdomain (preview-NN.unghost.com).
  if (origin && /^preview-\d+\.unghost\.com$/.test(origin)) return null;
  if (referer && /^preview-\d+\.unghost\.com$/.test(referer)) return null;

  return NextResponse.json({ error: "bad_origin" }, { status: 403 });
}

/** Allow-list a wider set of hosts for testing or scripts. */
export function __addAllowedHost(host: string): void {
  ALLOWED_HOSTS.add(host);
}
