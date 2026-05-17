import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { getUserByEmail } from "@/server/store";
import { issueEmailVerifyToken } from "@/server/auth/email-verify-token";
import { sendVerifyEmail } from "@/server/integrations/email";

export const runtime = "nodejs";

const Input = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * POST /api/auth/resend-email-verify { email }
 *
 * Always returns 200 — never reveals whether the email is registered, to
 * prevent enumeration. If a real account is found and is not already
 * verified, a fresh token is issued + emailed.
 */
async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;

  const user = await getUserByEmail(parsed.data.email);
  if (user && !user.emailVerified) {
    const verify = await issueEmailVerifyToken(user.id);
    if (verify.token) {
      await sendVerifyEmail(user.email, verify.token);
    }
  }

  // Same opaque response regardless. UI says "If your email is on file,
  // a new link is on its way."
  return NextResponse.json({ ok: true });
}

export const POST = withRateLimit(
  { bucket: "auth.resend-email-verify", limit: 5, windowSec: 600, by: "ip" },
  withApiErrorTracking(handler),
);
