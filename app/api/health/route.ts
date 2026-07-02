import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongo } from "@/server/db/mongo";
import { redis, redisMode } from "@/server/db/redis";
import { logger } from "@/server/lib/logger";
import { listIntegrations } from "@/server/integrations/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health endpoint.
 *
 * Returns 200 only when Mongo + Redis are reachable. Used by:
 *   - Cloudflare Container liveness probe
 *   - GitHub Actions post-deploy smoke
 *   - Better Stack synthetic uptime checks
 */
function sanitiseError(err: unknown): string {
  // In dev keep the full message for debuggability. In prod the health
  // endpoint is public — a failing check would otherwise leak Mongo/Redis
  // driver text (auth mechanism, DB name, sometimes a URI substring) to
  // anyone probing `/api/health`. Sentry + `logger.error` still get the
  // full stack via the caller, so ops loses nothing.
  if (process.env.NODE_ENV !== "production") {
    return err instanceof Error ? err.message : "unknown";
  }
  return "unavailable";
}

export async function GET() {
  const t0 = Date.now();
  const result: Record<string, unknown> = {
    ok: true,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
    environment: process.env.NODE_ENV ?? "development",
    region: process.env.DEPLOY_REGION ?? "local",
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, { ok: boolean; latencyMs?: number; mode?: string; error?: string }>,
  };

  // Full error strings collected here for logging; the payload sent on the
  // wire uses `sanitiseError` so the public endpoint never leaks driver
  // internals.
  const rawErrors: Record<string, string> = {};

  // Mongo check — connect (cached) + ping
  try {
    const mongoStart = Date.now();
    await connectMongo();
    await mongoose.connection.db?.admin().ping();
    (result.checks as Record<string, unknown>).mongo = {
      ok: true,
      latencyMs: Date.now() - mongoStart,
    };
  } catch (e) {
    result.ok = false;
    rawErrors.mongo = e instanceof Error ? e.message : "unknown";
    (result.checks as Record<string, unknown>).mongo = {
      ok: false,
      error: sanitiseError(e),
    };
  }

  // Redis check — set + get a probe key
  try {
    const redisStart = Date.now();
    const r = redis();
    await r.set("__health_probe__", "1", { ex: 10 });
    const v = await r.get("__health_probe__");
    if (v !== "1") throw new Error("redis_round_trip_failed");
    (result.checks as Record<string, unknown>).redis = {
      ok: true,
      latencyMs: Date.now() - redisStart,
      mode: redisMode(),
    };
  } catch (e) {
    result.ok = false;
    rawErrors.redis = e instanceof Error ? e.message : "unknown";
    (result.checks as Record<string, unknown>).redis = {
      ok: false,
      error: sanitiseError(e),
    };
  }

  // Adapter modes snapshot — non-failing summary so ops can see at a glance
  // which integrations are running mocked vs live. A "mock" entry in prod is
  // a warning sign but not an outage; the actual hard refusal lives inside
  // each adapter (e.g. payments assertNotMockInProd).
  result.integrations = listIntegrations().map((i) => ({
    id: i.id,
    mode: i.mode,
  }));

  result.totalLatencyMs = Date.now() - t0;
  if (!result.ok) {
    // The public payload was sanitised; the log gets the full driver text
    // so ops / Sentry still has everything to diagnose.
    logger.error(
      { checks: result.checks, rawErrors },
      "health.failed",
    );
  }
  return NextResponse.json(result, {
    status: result.ok ? 200 : 503,
    headers: {
      "x-app-version": String(result.version),
      "cache-control": "no-store",
    },
  });
}
