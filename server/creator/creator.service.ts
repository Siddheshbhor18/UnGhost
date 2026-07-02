/**
 * Creator lifecycle — onboard, read, search, and status transitions. A creator
 * is a `User` with `role:"creator"` plus a `CreatorProfile` and a first
 * `CommissionAgreement`. The referral code is unique + immutable once minted
 * (ground rules §0.1/§0.2).
 *
 * Status machine: pending → active (on password set), active ⇄ suspended,
 * {active,suspended,pending} → terminated (terminal). Enforced here.
 */
import { randomBytes } from "node:crypto";
import { connectMongo } from "@/server/db/mongo";
import { UserModel } from "@/server/db/models";
import { getUserByEmail, slugify } from "@/server/store";
import { checkPasswordPolicy, hashPassword } from "@/server/auth/password";
import {
  CreatorProfileModel,
  cleanDoc,
  cleanDocs,
} from "@/server/db/creator-models";
import { logCreatorEvent } from "@/server/creator/event.service";
import {
  setCommissionAgreement,
  getActiveAgreement,
} from "@/server/creator/commission.service";
import type {
  CreateCreatorInput,
  CreatorProfile,
  CreatorStatus,
  CommissionAgreement,
  PaymentDetailsInput,
  SocialLinks,
} from "@/server/creator/types";

export type CreateCreatorResult =
  | { ok: true; profile: CreatorProfile; agreement: CommissionAgreement }
  | { ok: false; reason: "email_taken" | "code_taken" | "weak_password"; detail?: string };

/**
 * Mint a unique, URL-safe referral code from a seed (the creator's name or an
 * admin-supplied preference). Collision-checked against existing profiles; a
 * short nonce is appended on clash. The DB unique index is the final backstop.
 */
export async function generateReferralCode(seed: string): Promise<string> {
  await connectMongo();
  const base = slugify(seed) || `creator-${randomBytes(2).toString("hex")}`;
  let code = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await CreatorProfileModel.findOne({
      referralCode: code,
    }).lean();
    if (!exists) return code;
    code = `${base}-${randomBytes(2).toString("hex")}`;
  }
  // Extremely unlikely; fall back to a fully random suffix.
  return `${base}-${randomBytes(4).toString("hex")}`;
}

export async function createCreator(
  input: CreateCreatorInput,
  createdByAdminId: string,
): Promise<CreateCreatorResult> {
  await connectMongo();
  const email = input.email.trim().toLowerCase();

  const existing = await getUserByEmail(email);
  if (existing) return { ok: false, reason: "email_taken" };

  // Admin-set password: reject weak values with the same policy the signup
  // flow enforces so the two identity-write paths don't drift. The password
  // itself is bcrypt-hashed (12 rounds via hashPassword) — never persisted
  // in plaintext and never echoed back on the response.
  const policy = checkPasswordPolicy(input.password);
  if (!policy.ok) {
    return { ok: false, reason: "weak_password", detail: policy.reason };
  }
  const passwordHash = await hashPassword(input.password);

  const referralCode = await generateReferralCode(
    input.referralCode ?? input.name,
  );
  const now = new Date().toISOString();
  const creatorId = `cr_${randomBytes(8).toString("hex")}`;

  // Creator User: bcrypt-hashed password from admin input. Email is marked
  // unverified because the admin didn't prove the creator owns it — but the
  // account is `active` (not suspended) so login works immediately with the
  // credentials the admin hands over out-of-band.
  try {
    await UserModel.create({
      _id: creatorId,
      email,
      role: "creator",
      name: input.name.trim(),
      passwordHash,
      plan: "free",
      planType: "free",
      emailVerified: false,
      status: "active",
      createdAt: now,
    });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return { ok: false, reason: "email_taken" };
    }
    throw err;
  }

  // Profile lands `active` on day one — no separate token-activation step
  // ever runs, so we stamp `acceptedAt` = createdAt (same op the activate
  // route used to do). Downstream views that gate on "active" (payout eligibility,
  // dashboard visibility) work immediately.
  const profile: CreatorProfile = {
    creatorId,
    referralCode,
    status: "active",
    socialLinks: input.socialLinks ?? {},
    bio: input.bio,
    invitedAt: now,
    acceptedAt: now,
    createdByAdminId,
    createdAt: now,
  };
  await CreatorProfileModel.create({ _id: creatorId, ...profile });

  const agreement = await setCommissionAgreement(
    creatorId,
    input.commission,
    createdByAdminId,
  );

  await logCreatorEvent({
    entityType: "creator",
    entityId: creatorId,
    actorType: "admin",
    actorId: createdByAdminId,
    eventType: "creator.created",
    metadata: { referralCode, email },
  });

  return { ok: true, profile, agreement };
}

export async function getCreatorById(
  creatorId: string,
): Promise<CreatorProfile | undefined> {
  await connectMongo();
  const doc = await CreatorProfileModel.findById(creatorId).lean();
  return cleanDoc<CreatorProfile>(doc);
}

export async function getCreatorByCode(
  referralCode: string,
): Promise<CreatorProfile | undefined> {
  await connectMongo();
  const doc = await CreatorProfileModel.findOne({ referralCode }).lean();
  return cleanDoc<CreatorProfile>(doc);
}

export interface ListCreatorsOptions {
  status?: CreatorStatus;
  limit?: number;
}

export async function listCreators(
  opts: ListCreatorsOptions = {},
): Promise<CreatorProfile[]> {
  await connectMongo();
  const q: Record<string, unknown> = {};
  if (opts.status) q.status = opts.status;
  const docs = await CreatorProfileModel.find(q)
    .sort({ createdAt: -1 })
    .limit(opts.limit ?? 200)
    .lean();
  return cleanDocs<CreatorProfile>(docs);
}

/**
 * Search creators by referral code or by the email/name of the underlying
 * user. Two-step: resolve matching user ids, then OR them with code matches.
 */
export async function searchCreators(
  query: string,
  limit = 50,
): Promise<CreatorProfile[]> {
  await connectMongo();
  const q = query.trim();
  if (!q) return listCreators({ limit });
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = { $regex: safe, $options: "i" };

  const userMatches = await UserModel.find({
    role: "creator",
    $or: [{ email: rx }, { name: rx }],
  })
    .select({ _id: 1 })
    .lean();
  const ids = userMatches.map((u) => String(u._id));

  const docs = await CreatorProfileModel.find({
    $or: [{ referralCode: rx }, { creatorId: { $in: ids } }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return cleanDocs<CreatorProfile>(docs);
}

// ── Status transitions ───────────────────────────────────────────────────────

async function setStatus(
  creatorId: string,
  next: CreatorStatus,
  patch: Record<string, unknown>,
  eventType: string,
  adminId: string,
  metadata?: Record<string, unknown>,
): Promise<CreatorProfile | undefined> {
  await connectMongo();
  const updated = await CreatorProfileModel.findByIdAndUpdate(
    creatorId,
    { $set: { status: next, ...patch } },
    { returnDocument: "after" },
  ).lean();
  const profile = cleanDoc<CreatorProfile>(updated);
  if (profile) {
    await logCreatorEvent({
      entityType: "creator",
      entityId: creatorId,
      actorType: "admin",
      actorId: adminId,
      eventType,
      metadata,
    });
  }
  return profile;
}

export class CreatorTransitionError extends Error {}

export async function suspendCreator(
  creatorId: string,
  reason: string,
  adminId: string,
): Promise<CreatorProfile | undefined> {
  const current = await getCreatorById(creatorId);
  if (!current) return undefined;
  if (current.status === "terminated") {
    throw new CreatorTransitionError("cannot suspend a terminated creator");
  }
  return setStatus(
    creatorId,
    "suspended",
    { suspendedAt: new Date().toISOString(), suspendedReason: reason },
    "creator.suspended",
    adminId,
    { reason },
  );
}

export async function reactivateCreator(
  creatorId: string,
  adminId: string,
): Promise<CreatorProfile | undefined> {
  const current = await getCreatorById(creatorId);
  if (!current) return undefined;
  if (current.status !== "suspended") {
    throw new CreatorTransitionError("only a suspended creator can reactivate");
  }
  return setStatus(
    creatorId,
    "active",
    { suspendedAt: undefined, suspendedReason: undefined },
    "creator.reactivated",
    adminId,
  );
}

export async function terminateCreator(
  creatorId: string,
  reason: string,
  adminId: string,
): Promise<CreatorProfile | undefined> {
  const current = await getCreatorById(creatorId);
  if (!current) return undefined;
  if (current.status === "terminated") return current;
  return setStatus(
    creatorId,
    "terminated",
    { terminatedAt: new Date().toISOString(), suspendedReason: reason },
    "creator.terminated",
    adminId,
    { reason },
  );
}

// ── Profile + payment-details settings ───────────────────────────────────────

export async function updateCreatorProfile(
  creatorId: string,
  patch: { socialLinks?: SocialLinks; bio?: string },
): Promise<CreatorProfile | undefined> {
  await connectMongo();
  const set: Record<string, unknown> = {};
  if (patch.socialLinks) set.socialLinks = patch.socialLinks;
  if (patch.bio !== undefined) set.bio = patch.bio;
  const updated = await CreatorProfileModel.findByIdAndUpdate(
    creatorId,
    { $set: set },
    { returnDocument: "after" },
  ).lean();
  return cleanDoc<CreatorProfile>(updated);
}

/**
 * Creator sets/updates their own bank/UPI details. Any change resets `verified`
 * to false — an admin must re-verify before the next payout (§9.6).
 */
export async function updateCreatorPaymentDetails(
  creatorId: string,
  input: PaymentDetailsInput,
): Promise<CreatorProfile | undefined> {
  await connectMongo();
  const updated = await CreatorProfileModel.findByIdAndUpdate(
    creatorId,
    {
      $set: {
        paymentDetails: {
          method: input.method,
          accountRef: input.accountRef,
          accountName: input.accountName,
          ifsc: input.ifsc,
          verified: false,
        },
      },
    },
    { returnDocument: "after" },
  ).lean();
  const profile = cleanDoc<CreatorProfile>(updated);
  if (profile) {
    await logCreatorEvent({
      entityType: "creator",
      entityId: creatorId,
      actorType: "creator",
      actorId: creatorId,
      eventType: "creator.payment_details_updated",
    });
  }
  return profile;
}

/** Admin marks a creator's payment details verified (§9.6 payout gate). */
export async function verifyCreatorPaymentDetails(
  creatorId: string,
  adminId: string,
): Promise<CreatorProfile | undefined> {
  await connectMongo();
  const current = await getCreatorById(creatorId);
  if (!current?.paymentDetails) return undefined;
  const updated = await CreatorProfileModel.findByIdAndUpdate(
    creatorId,
    {
      $set: {
        "paymentDetails.verified": true,
        "paymentDetails.verifiedByAdminId": adminId,
        "paymentDetails.verifiedAt": new Date().toISOString(),
      },
    },
    { returnDocument: "after" },
  ).lean();
  const profile = cleanDoc<CreatorProfile>(updated);
  if (profile) {
    await logCreatorEvent({
      entityType: "creator",
      entityId: creatorId,
      actorType: "admin",
      actorId: adminId,
      eventType: "creator.payment_details_verified",
    });
  }
  return profile;
}

/** Count of students permanently attributed to this creator. */
export async function countReferrals(creatorId: string): Promise<number> {
  await connectMongo();
  return UserModel.countDocuments({ referredByCreatorId: creatorId });
}
