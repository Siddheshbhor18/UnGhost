import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  rateLimit,
  rateLimitResponse,
  identifierFromRequest,
} from "@/server/lib/rate-limit";
import { emailMode, sendPasswordReset } from "@/server/integrations/email";
import { getUserByEmail } from "@/server/store";
import { issueResetToken } from "@/server/auth/reset-token";

export const runtime = "nodejs";

const Input = z.object({ email: z.string().email().max(254) });

/**
 * POST { email } → send reset link.
 *
 * Always returns ok=true to prevent email enumeration. Internally:
 *   1. Resolve the email (silent miss if not registered).
 *   2. Rate-limit per email (5 requests / 10 minutes via Redis).
 *   3. Issue a 32-byte hex token in Redis with 1-hour TTL.
 *   4. Send the magic link via the email adapter.
 */
export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  // 10 password-reset requests / 10 min / IP — backs up the per-email limit in issueResetToken.
  const rl = await rateLimit("pw-reset", identifierFromRequest(req), {
    limit: 10,
    windowSec: 600,
  });
  if (!rl.allowed) return rateLimitResponse(rl);
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const normalised = parsed.data.email.trim().toLowerCase();
  const user = await getUserByEmail(normalised);
  if (user) {
    const { token, rateLimited } = await issueResetToken(user.id, normalised);
    if (!rateLimited) {
      await sendPasswordReset(normalised, token);
    }
  }
  return NextResponse.json({ ok: true, mode: emailMode() });
}
