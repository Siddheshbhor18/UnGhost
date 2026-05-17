import { NextResponse } from "next/server";
import { consumeEmailVerifyToken } from "@/server/auth/email-verify-token";
import { markEmailVerified, writeAuditLog, getUserById } from "@/server/store";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";

export const runtime = "nodejs";

interface Ctx {
  params: { token: string };
}

/**
 * GET /api/auth/verify-email/[token]
 *
 * One-shot consume: looks up token in Redis, flips emailVerified=true.
 * Returns JSON (the /verify-email/[token] page calls this on mount). Page
 * decides what to render based on `ok` flag.
 *
 * Rate limited per IP — 30 / min so an attacker can't brute-force the
 * 64-hex token namespace.
 */
async function handler(_req: Request, { params }: Ctx) {
  const { token } = params;
  const result = await consumeEmailVerifyToken(token);
  if (!result.ok || !result.userId) {
    return NextResponse.json(
      {
        ok: false,
        reason: result.reason ?? "invalid",
        message:
          result.reason === "expired"
            ? "This verification link has expired. Request a new one from /login."
            : "This verification link is invalid.",
      },
      { status: 400 },
    );
  }

  const user = await getUserById(result.userId);
  if (!user) {
    return NextResponse.json(
      { ok: false, reason: "user_missing" },
      { status: 404 },
    );
  }

  await markEmailVerified(result.userId);
  await writeAuditLog({
    actorId: result.userId,
    actorRole: user.role as "student" | "recruiter",
    action: "auth.email-verified",
    targetType: "user",
    targetId: result.userId,
    summary: `Email ${user.email} verified`,
  });

  return NextResponse.json({ ok: true, email: user.email });
}

export const GET = withRateLimit(
  { bucket: "auth.verify-email", limit: 30, windowSec: 60, by: "ip" },
  withApiErrorTracking(handler),
);
