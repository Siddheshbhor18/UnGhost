/**
 * Edge middleware.
 *
 * Today: attaches an `x-request-id` correlation header to every request so
 * server logs and Sentry traces share an id. Future: rate-limit guard, geo
 * routing, A/B flag injection.
 */
import { NextResponse, type NextRequest } from "next/server";

function genId(): string {
  // 16-char hex from crypto.getRandomValues — Edge-safe.
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function middleware(req: NextRequest) {
  const incoming = req.headers.get("x-request-id");
  const requestId = incoming && /^[a-f0-9-]{8,64}$/.test(incoming) ? incoming : genId();
  const res = NextResponse.next({
    request: { headers: new Headers(req.headers) },
  });
  res.headers.set("x-request-id", requestId);
  return res;
}

export const config = {
  // Run on every page + API request, but skip static assets + Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
