import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { softDeleteUser } from "@/server/auth/dpdp";
import { writeAuditLog, getUserById } from "@/server/store";
import { verifyPassword } from "@/server/auth/password";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  identifierFromRequest,
  rateLimit,
  rateLimitResponse,
} from "@/server/lib/rate-limit";

export const runtime = "nodejs";

const Input = z.object({
  // Password is required for credentials users but optional for OAuth-only
  // users who have no passwordHash (they proved identity via OAuth session).
  password: z.string().min(1).max(72).optional(),
  reason: z.string().max(500).optional(),
});

/**
 * DPDP § 13 — right to erasure.
 *
 * POST { password, reason? } → soft-delete the authenticated user.
 *
 *   1. Confirm password (defence against session hijack / shoulder-surfing).
 *   2. Soft-delete (strip PII, mark status, queue 30-day purge).
 *   3. Write an audit-log entry (legally required retention).
 *
 * Hard delete happens via the SLA sweep after the 30-day grace window.
 * Rate-limited to 3 attempts / day / user.
 */
export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const rl = await rateLimit(
    "dpdp-delete",
    identifierFromRequest(req, session.user.id),
    { limit: 3, windowSec: 60 * 60 * 24 },
  );
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;

  const user = await getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // OAuth-only users (Google sign-in, no password set) skip the password
  // check — they're already authenticated via their OAuth session. Hybrid
  // users who later set a password still need to confirm it.
  const isOAuthOnly = !!(user as any).oauthProvider && !user.passwordHash;
  if (!isOAuthOnly) {
    if (!parsed.data.password) {
      return NextResponse.json({ error: "password_required" }, { status: 400 });
    }
    const ok = (await verifyPassword(parsed.data.password, user.passwordHash)).ok;
    if (!ok) {
      return NextResponse.json({ error: "wrong_password" }, { status: 401 });
    }
  }

  await softDeleteUser(session.user.id, parsed.data.reason);
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: user.role,
    action: "user.dpdp_erasure",
    targetType: "user",
    targetId: session.user.id,
    summary: `DPDP § 13 erasure requested${parsed.data.reason ? `: ${parsed.data.reason}` : ""}`,
    reason: parsed.data.reason,
  });

  return NextResponse.json({
    ok: true,
    purgeAfter: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    message:
      "Your account is scheduled for deletion in 30 days. Contact support to cancel.",
  });
}
