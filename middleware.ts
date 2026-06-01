/**
 * Edge middleware.
 *
 *  1. Attaches an `x-request-id` correlation header to every request so server
 *     logs and Sentry traces share an id.
 *  2. Session-revocation gate: decodes the NextAuth JWT and compares the epoch
 *     it was minted at against the user's current revocation epoch in Redis. A
 *     ban / suspend / password-reset bumps that epoch, so any live token minted
 *     earlier is forced to re-authenticate — without waiting out the 30-day JWT
 *     lifetime. Fail-open on any error so a Redis blip never locks users out.
 *
 * Edge-safety: this file must not import the Mongo-backed store or NextAuth
 * options (both pull `mongoose`, which can't run on the edge). `getToken` only
 * needs the secret, and `getSessionEpoch` only touches Upstash REST.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { getSessionEpoch } from "@/server/auth/session-epoch";

const IS_PROD = process.env.NODE_ENV === "production";
// Mirror server/auth/index.ts secret resolution. In prod the env var is
// mandatory (auth boot throws if missing); dev uses the same stable fallback.
const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? "dev-only-secret-do-not-use-in-prod";
const SESSION_COOKIE = IS_PROD
  ? "__Secure-next-auth.session-token"
  : "next-auth.session-token";

function genId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Paths where the revocation gate is skipped (avoids redirect loops). */
function isExemptPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/api/auth/")
  );
}

export async function middleware(req: NextRequest) {
  const incoming = req.headers.get("x-request-id");
  const requestId =
    incoming && /^[a-f0-9-]{8,64}$/.test(incoming) ? incoming : genId();

  const revoked = await isSessionRevoked(req);

  if (revoked) {
    const pathname = req.nextUrl.pathname;
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json(
        { error: "session_revoked" },
        { status: 401 },
      );
      res.cookies.delete(SESSION_COOKIE);
      res.headers.set("x-request-id", requestId);
      return res;
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?revoked=1";
    const res = NextResponse.redirect(url);
    res.cookies.delete(SESSION_COOKIE);
    res.headers.set("x-request-id", requestId);
    return res;
  }

  const res = NextResponse.next({
    request: { headers: new Headers(req.headers) },
  });
  res.headers.set("x-request-id", requestId);
  return res;
}

/**
 * True when the caller holds a session token whose epoch is behind the user's
 * current revocation epoch. Returns false (allow) on no-token or any error.
 */
async function isSessionRevoked(req: NextRequest): Promise<boolean> {
  if (isExemptPath(req.nextUrl.pathname)) return false;
  try {
    const token = (await getToken({
      req,
      secret: AUTH_SECRET,
      secureCookie: IS_PROD,
    })) as { id?: string; epoch?: number } | null;
    const userId = token?.id;
    if (!userId) return false; // anonymous — nothing to revoke
    const tokenEpoch = typeof token?.epoch === "number" ? token.epoch : 0;
    const currentEpoch = await getSessionEpoch(userId);
    return currentEpoch > tokenEpoch;
  } catch {
    // Decode / Redis failure — fail open so a transient blip can't lock out
    // every authenticated user. Bans still block re-login via authorize().
    return false;
  }
}

export const config = {
  // Run on every page + API request, but skip static assets + Next internals.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
