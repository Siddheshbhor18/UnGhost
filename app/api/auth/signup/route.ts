import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import {
  hashPassword,
  checkPasswordPolicy,
} from "@/server/auth/password";
import { createUserWithCredentials } from "@/server/store";
import { issueEmailVerifyToken } from "@/server/auth/email-verify-token";
import { sendVerifyEmail } from "@/server/integrations/email";
import { sendOtp, normalisePhone } from "@/server/integrations/sms";
import { writeAuditLog } from "@/server/store";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

const Input = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  // Country prefix + national number, normalised before insert. We accept
  // anything 7-15 digits — covers India (10) through long international.
  phone: z.string().trim().min(7).max(20),
  password: z.string().min(8).max(72),
  role: z.enum(["student", "recruiter"]),
  acceptTos: z.literal(true),
  acceptService: z.literal(true),
  acceptMarketing: z.boolean().optional(),
});

/**
 * POST /api/auth/signup
 *
 * Public endpoint. Creates a new user with plan=free, kicks off email
 * verification + phone OTP. Returns `{ userId }` plus mock-mode helpers
 * (`demoOtp`) so dev flows can complete without external services.
 *
 * Rate limited per IP — 5 attempts/min. Same-origin guard so external
 * scripts can't trigger signup spam from someone else's browser.
 */
async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const policy = checkPasswordPolicy(data.password);
  if (!policy.ok) {
    return NextResponse.json(
      { error: "weak_password", reason: policy.reason },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(data.password);
  const normalisedPhone = normalisePhone(data.phone);

  const result = await createUserWithCredentials({
    email: data.email,
    phone: normalisedPhone,
    passwordHash,
    name: data.name,
    role: data.role,
  });

  if (!result.ok) {
    // Friendly 409 — UI tells user which identifier is taken so they can
    // recover to /forgot-password or change the field.
    return NextResponse.json(
      {
        error: result.reason,
        message:
          result.reason === "email_taken"
            ? "An account already uses this email. Sign in or reset your password."
            : "An account already uses this phone number.",
      },
      { status: 409 },
    );
  }

  const user = result.user;

  // Issue email verify token + send link. If Redis-side rate limit trips
  // (shouldn't on a fresh user) we still complete signup — the user can
  // resend later.
  const verify = await issueEmailVerifyToken(user.id);
  if (verify.token) {
    await sendVerifyEmail(user.email, verify.token).catch((err) => {
      logger.warn({ err, userId: user.id }, "signup.email-send-failed");
    });
  }

  // Fire OTP. Capture demoOtp in mock mode so the UI can auto-fill it.
  const otp = await sendOtp(normalisedPhone);

  await writeAuditLog({
    actorId: user.id,
    actorRole: data.role,
    action: "auth.signup",
    targetType: "user",
    targetId: user.id,
    summary: `Signup ${data.role} ${user.email}`,
  });

  logger.info(
    { userId: user.id, role: data.role, otpMode: otp.channel },
    "auth.signup",
  );

  return NextResponse.json(
    {
      ok: true,
      userId: user.id,
      role: user.role,
      needsEmailVerify: true,
      needsPhoneVerify: true,
      // demoOtp is set ONLY in mock mode by the SMS adapter — present in dev,
      // never in production.
      demoOtp: otp.demoOtp,
    },
    { status: 201 },
  );
}

export const POST = withRateLimit(
  { bucket: "auth.signup", limit: 5, windowSec: 60, by: "ip" },
  withApiErrorTracking(handler),
);
