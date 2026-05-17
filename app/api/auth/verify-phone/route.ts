import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { verifyOtp, normalisePhone } from "@/server/integrations/sms";
import {
  getUserById,
  markPhoneVerified,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

const Input = z.object({
  userId: z.string().min(1).max(64),
  phone: z.string().trim().min(7).max(20),
  code: z.string().regex(/^\d{4,8}$/, "OTP must be digits"),
});

/**
 * POST /api/auth/verify-phone { userId, phone, code }
 *
 * Verifies an OTP issued by the SMS adapter and flips phoneVerified=true.
 * Caller is the freshly-signed-up user who does NOT yet have a session,
 * so we use the userId returned from /api/auth/signup as the link.
 *
 * Phone must match the user's profile.contactPhone — prevents an attacker
 * with a userId from verifying their own phone against someone else's row.
 *
 * Rate limited per IP — 10 / min. The underlying verifyOtp() also locks
 * out a phone after 3 bad codes (15 min cooldown).
 */
async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const { userId, phone, code } = parsed.data;

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  const expected = user.profile?.contactPhone ?? "";
  if (normalisePhone(phone) !== normalisePhone(expected)) {
    return NextResponse.json(
      { error: "phone_mismatch" },
      { status: 400 },
    );
  }

  const result = await verifyOtp(phone, code);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "otp_failed" },
      { status: 400 },
    );
  }

  await markPhoneVerified(userId);
  await writeAuditLog({
    actorId: userId,
    actorRole: user.role as "student" | "recruiter",
    action: "auth.phone-verified",
    targetType: "user",
    targetId: userId,
    summary: `Phone verified for ${user.email}`,
  });

  return NextResponse.json({ ok: true });
}

export const POST = withRateLimit(
  { bucket: "auth.verify-phone", limit: 10, windowSec: 60, by: "ip" },
  withApiErrorTracking(handler),
);
