import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody, parseQuery } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { consumeResetToken, peekResetToken } from "@/server/auth/reset-token";
import { hashPassword, checkPasswordPolicy } from "@/server/auth/password";
import { setUserPasswordHash } from "@/server/store";

export const runtime = "nodejs";

const TokenQuery = z.object({ token: z.string().min(32).max(128) });
const ResetInput = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(8).max(72),
});

/** GET ?token=... → check if a reset token is still valid (no consume). */
export async function GET(req: Request) {
  const parsed = parseQuery(req, TokenQuery);
  if (!parsed.ok) return parsed.response;
  const userId = await peekResetToken(parsed.data.token);
  return NextResponse.json({ valid: !!userId });
}

/** POST { token, password } → consume the token and rotate the password. */
async function postHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const parsed = await parseBody(req, ResetInput);
  if (!parsed.ok) return parsed.response;
  const { token, password } = parsed.data;

  const policy = checkPasswordPolicy(password);
  if (!policy.ok) {
    return NextResponse.json(
      { error: "weak_password", reason: policy.reason },
      { status: 400 },
    );
  }
  const userId = await consumeResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 410 });
  }
  const newHash = await hashPassword(password);
  await setUserPasswordHash(userId, newHash);
  return NextResponse.json({ ok: true });
}

// 10 attempts / 10 min / ip — blunts token-guessing + reused-token replay.
export const POST = withRateLimit(
  { bucket: "auth.reset-password", limit: 10, windowSec: 600, by: "ip" },
  withApiErrorTracking(postHandler),
);
