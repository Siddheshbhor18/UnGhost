/**
 * Referral sessions + attribution.
 *
 *  - A click on `/r/<code>` mints a session (random token → `ug_ref` cookie).
 *  - Signup consumes the cookie and attaches the creator to the new user,
 *    permanently and first-touch-wins (ground rules §0.3/§0.4).
 *
 * Loophole §9.10: signup validates the session's own `expiresAt`, NOT the
 * cron-set `status`. The daily sweep only flips `status` for housekeeping, so a
 * session swept moments before signup (but still inside its 30-day TTL) still
 * converts.
 */
import { randomBytes } from "node:crypto";
import { connectMongo } from "@/server/db/mongo";
import { UserModel } from "@/server/db/models";
import { ReferralSessionModel, cleanDoc } from "@/server/db/creator-models";
import { getCreatorByCode } from "@/server/creator/creator.service";
import { logCreatorEvent } from "@/server/creator/event.service";
import {
  REFERRAL_SESSION_TTL_DAYS,
  type ReferralSession,
} from "@/server/creator/types";

const DAY_MS = 86_400_000;

export interface CreateReferralSessionInput {
  code: string;
  landingPage?: string;
  campaign?: string;
  ipHash?: string;
  userAgent?: string;
}

export interface CreateReferralSessionResult {
  token: string;
  creatorId: string;
}

/**
 * Mint a session for an active creator's code. Returns null when the code is
 * unknown or the creator is not active — the public route then redirects home
 * silently (no enumeration signal).
 */
export async function createReferralSession(
  input: CreateReferralSessionInput,
): Promise<CreateReferralSessionResult | null> {
  await connectMongo();
  const creator = await getCreatorByCode(input.code);
  if (!creator || creator.status !== "active") return null;

  const now = Date.now();
  const token = randomBytes(24).toString("hex");
  const session: ReferralSession = {
    sessionToken: token,
    creatorId: creator.creatorId,
    landingPage: input.landingPage,
    campaign: input.campaign,
    ipHash: input.ipHash,
    userAgent: input.userAgent,
    status: "active",
    expiresAt: new Date(now + REFERRAL_SESSION_TTL_DAYS * DAY_MS).toISOString(),
    createdAt: new Date(now).toISOString(),
  };
  await ReferralSessionModel.create({ _id: token, ...session });

  await logCreatorEvent({
    entityType: "referral_session",
    entityId: token,
    actorType: "system",
    eventType: "referral.session_created",
    metadata: { creatorId: creator.creatorId, campaign: input.campaign },
  });

  return { token, creatorId: creator.creatorId };
}

export type AttachResult =
  | { attributed: true; creatorId: string }
  | { attributed: false; reason: "no_session" | "expired" | "already_attributed" };

/**
 * Attach the session's creator to a freshly-created user. First-touch wins: the
 * update only fires when the user has no `referredByCreatorId` yet, so a second
 * link click before signup can never overwrite the first attribution.
 */
export async function attachAttribution(
  userId: string,
  sessionToken: string,
): Promise<AttachResult> {
  await connectMongo();
  const session = cleanDoc<ReferralSession>(
    await ReferralSessionModel.findById(sessionToken).lean(),
  );
  if (!session) return { attributed: false, reason: "no_session" };

  // expiresAt is the source of truth (§9.10) — ignore a possibly-swept status.
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    return { attributed: false, reason: "expired" };
  }

  const now = new Date().toISOString();
  const res = await UserModel.updateOne(
    { _id: userId, referredByCreatorId: { $exists: false } },
    {
      $set: {
        referredByCreatorId: session.creatorId,
        referralSessionId: sessionToken,
        referrerCapturedAt: now,
      },
    },
  );
  if (res.modifiedCount === 0) {
    return { attributed: false, reason: "already_attributed" };
  }

  await ReferralSessionModel.updateOne(
    { _id: sessionToken },
    { $set: { status: "converted", convertedAt: now, convertedUserId: userId } },
  );
  await logCreatorEvent({
    entityType: "referral_session",
    entityId: sessionToken,
    actorType: "system",
    eventType: "referral.converted",
    metadata: { creatorId: session.creatorId, userId },
  });

  return { attributed: true, creatorId: session.creatorId };
}

/**
 * Housekeeping sweep — flip active sessions past their TTL to `expired`. Never
 * deletes (Phase 9). Attribution already keys off `expiresAt`, so this is purely
 * to keep the active set small. Returns the number flipped.
 */
export async function expireOldSessions(): Promise<number> {
  await connectMongo();
  const res = await ReferralSessionModel.updateMany(
    { status: "active", expiresAt: { $lt: new Date().toISOString() } },
    { $set: { status: "expired" } },
  );
  return res.modifiedCount ?? 0;
}
