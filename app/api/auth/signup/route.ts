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
import { isFreeEmailDomain } from "@/server/lib/email-domain";
import { sendVerifyEmail } from "@/server/integrations/email";
import {
  attachReferrerToUser,
  getPartnerByCode,
  writeAuditLog,
} from "@/server/store";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

const Input = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  // Phone is optional. Collected for ops/outreach only, never verified.
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  password: z.string().min(8).max(72),
  role: z.enum(["student", "recruiter"]),
  // Recruiter only — the company they represent. Validated as required for
  // recruiters in the handler.
  companyName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  acceptTos: z.literal(true),
  acceptService: z.literal(true),
  acceptMarketing: z.boolean().optional(),
  /** Channel-partner attribution code captured via `?ref=<code>` and held
   *  in the visitor's localStorage by `RefCapture`. Optional. */
  referrerCode: z
    .string()
    .regex(/^[a-z0-9-]+$/i)
    .min(3)
    .max(48)
    .optional()
    .or(z.literal("")),
});

/**
 * POST /api/auth/signup
 *
 * Public endpoint. Creates a new user with plan=free and kicks off email
 * verification. Returns `{ userId }`.
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

  // Recruiter anti-abuse: recruiters post jobs that reach every student
  // instantly, so we gate recruiter signup to a *work* email (company-owned
  // domain). Free/personal/disposable providers are rejected. Students are
  // unaffected — they can sign up with any valid email.
  if (data.role === "recruiter" && isFreeEmailDomain(data.email)) {
    return NextResponse.json(
      {
        error: "work_email_required",
        message:
          "Recruiter accounts need a work email on your company's domain. Personal or free email addresses aren't accepted.",
      },
      { status: 400 },
    );
  }

  // Recruiters must name their company at signup — an admin approves them into
  // that company.
  if (data.role === "recruiter" && !data.companyName?.trim()) {
    return NextResponse.json(
      {
        error: "company_required",
        message: "Enter your company name so we can verify and approve your account.",
      },
      { status: 400 },
    );
  }

  const policy = checkPasswordPolicy(data.password);
  if (!policy.ok) {
    return NextResponse.json(
      { error: "weak_password", reason: policy.reason },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(data.password);
  // Phone is optional — collected for ops outreach only, no OTP verification.
  // Pass empty string when absent so the store helper's uniqueness check
  // skips it gracefully (`if (phone) { ... }` inside).
  const normalisedPhone = data.phone ? data.phone.replace(/\s+/g, "") : "";

  const result = await createUserWithCredentials({
    email: data.email,
    phone: normalisedPhone,
    passwordHash,
    name: data.name,
    role: data.role,
    pendingCompanyName:
      data.role === "recruiter" ? data.companyName?.trim() : undefined,
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

  // Attribute this signup to a channel partner if the visitor came in via
  // `?ref=<code>`. The wizard reads localStorage on submit + sends the
  // code here. We look up the partner, attach, audit. Best-effort — a bad
  // code never blocks signup, it just goes unattributed.
  if (data.referrerCode) {
    try {
      const partner = await getPartnerByCode(data.referrerCode.toLowerCase());
      if (partner?.active) {
        await attachReferrerToUser(user.id, partner.id);
        await writeAuditLog({
          actorId: user.id,
          actorRole: data.role,
          action: "auth.signup-attributed",
          targetType: "user",
          targetId: user.id,
          summary: `Signup attributed to partner ${partner.code}`,
        });
      }
    } catch (err) {
      logger.warn(
        { err, code: data.referrerCode, userId: user.id },
        "signup.attribution-failed",
      );
    }
  }

  // Issue email verify token. Email send is fire-and-forget (don't block
  // the signup response on Resend API latency, which can be 500-1500ms).
  // Audit log also fire-and-forget — non-critical for the response.
  const verify = await issueEmailVerifyToken(user.id);
  if (verify.token) {
    void sendVerifyEmail(user.email, verify.token).catch((err) => {
      logger.warn({ err, userId: user.id }, "signup.email-send-failed");
    });
  }

  void writeAuditLog({
    actorId: user.id,
    actorRole: data.role,
    action: "auth.signup",
    targetType: "user",
    targetId: user.id,
    summary: `Signup ${data.role} ${user.email}`,
  }).catch(() => {
    /* audit failure must not block signup */
  });

  logger.info({ userId: user.id, role: data.role }, "auth.signup");

  return NextResponse.json(
    {
      ok: true,
      userId: user.id,
      role: user.role,
      needsEmailVerify: true,
    },
    { status: 201 },
  );
}

export const POST = withRateLimit(
  { bucket: "auth.signup", limit: 5, windowSec: 60, by: "ip" },
  withApiErrorTracking(handler),
);
