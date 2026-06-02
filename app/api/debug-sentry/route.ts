import { NextResponse } from "next/server";
import { withApiErrorTracking } from "@/server/lib/api-error";

export const runtime = "nodejs";

/**
 * TEMPORARY Sentry verification route. Throws on demand so we can confirm the
 * end-to-end capture chain (instrumentation.ts → server Sentry.init →
 * withApiErrorTracking → dashboard) actually fires on the live deploy.
 *
 * Route: GET /api/debug-sentry?token=<TEST_TOKEN>
 * Gated by a one-time random token so the public / bots can't spam Sentry.
 * The route does nothing but throw a benign test error (no data access), so a
 * literal token here is acceptable. DELETE this file once verification passes.
 */
const TEST_TOKEN = "6c92911fa8488289b3b79630a06ee6d0";

async function handler(req: Request) {
  const token = new URL(req.url).searchParams.get("token");

  // Wrong/absent token → behave like the route doesn't exist.
  if (token !== TEST_TOKEN) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Deliberate throw → caught by withApiErrorTracking → Sentry.captureException.
  throw new Error("sentry-verification: intentional test error (safe to ignore)");
}

export const GET = withApiErrorTracking(handler);
