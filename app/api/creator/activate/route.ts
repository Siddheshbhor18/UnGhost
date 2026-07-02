import { NextResponse } from "next/server";
import { z } from "zod";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { consumeResetToken } from "@/server/auth/reset-token";
import { hashPassword, checkPasswordPolicy } from "@/server/auth/password";
import { setUserPasswordHash } from "@/server/store";
import { connectMongo } from "@/server/db/mongo";
import { CreatorProfileModel } from "@/server/db/creator-models";
import { logCreatorEvent } from "@/server/creator/event.service";

export const runtime = "nodejs";

const ActivateInput = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(8).max(72),
});

/**
 * POST /api/creator/activate
 *
 * Public-by-token. Consumes a one-time set-password token, sets the creator's
 * password, and flips their profile pending → active. Same RBAC posture as
 * /api/auth/reset-password: the token *is* the authorization.
 */
async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const parsed = await parseBody(req, ActivateInput);
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
  // Revoke any live sessions — the credential being set is brand new, so no
  // pre-existing session should survive activation.
  await setUserPasswordHash(userId, newHash, { revokeSessions: true });

  // Flip pending → active. The `status: "pending"` filter is part of the
  // predicate so re-running activation can never silently reactivate a
  // suspended or terminated creator (loophole §10).
  await connectMongo();
  await CreatorProfileModel.updateOne(
    { _id: userId, status: "pending" },
    { $set: { status: "active", acceptedAt: new Date().toISOString() } },
  );

  await logCreatorEvent({
    entityType: "creator",
    entityId: userId,
    actorType: "creator",
    actorId: userId,
    eventType: "creator.activated",
  });

  return NextResponse.json({ ok: true });
}

// 10 attempts / 10 min / ip — blunts token-guessing + reused-token replay.
export const POST = withRateLimit(
  { bucket: "auth.creator-activate", limit: 10, windowSec: 600, by: "ip", fallbackInProcess: true },
  withApiErrorTracking(handler),
);
