/**
 * Creator-platform Mongoose schemas — the 7 collections from `referalsys.md`
 * §3 (as amended by §10.3). Same conventions as `server/db/models.ts`:
 * the domain `id` is used as `_id`, `withJsonTransform` strips `__v`.
 *
 * Indexes are declared inline (honoured in dev via `autoIndex`) AND registered
 * in `server/db/indexes.ts` + a migration for production parity.
 */
import mongoose, { Schema, Model } from "mongoose";
import { withJsonTransform } from "@/server/db/models";
import type {
  CreatorProfile,
  CommissionAgreement,
  ReferralSession,
  CreatorReward,
  CreditLedgerEntry,
  PayoutRequest,
  CreatorEvent,
} from "@/server/creator/types";

// ---------- creatorProfiles (keyed by creatorId = User._id) ----------
const SocialLinksSchema = new Schema(
  {
    instagram: String,
    youtube: String,
    linkedin: String,
    twitter: String,
  },
  { _id: false },
);

const PaymentDetailsSchema = new Schema(
  {
    method: { type: String, required: true },
    accountRef: { type: String, required: true },
    accountName: String,
    ifsc: String,
    verified: { type: Boolean, default: false },
    verifiedByAdminId: String,
    verifiedAt: String,
  },
  { _id: false },
);

const CreatorProfileSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true }, // = creatorId
      creatorId: { type: String, required: true, index: true },
      referralCode: { type: String, required: true, unique: true },
      status: { type: String, required: true, index: true },
      socialLinks: { type: SocialLinksSchema, default: {} },
      bio: String,
      paymentDetails: { type: PaymentDetailsSchema, default: undefined },
      invitedAt: String,
      acceptedAt: String,
      suspendedAt: String,
      suspendedReason: String,
      terminatedAt: String,
      createdByAdminId: { type: String, required: true },
      createdAt: { type: String, required: true },
    },
    { versionKey: false },
  ),
);

export const CreatorProfileModel: Model<CreatorProfile> =
  (mongoose.models.CreatorProfile as Model<CreatorProfile>) ||
  mongoose.model<CreatorProfile>("CreatorProfile", CreatorProfileSchema);

// ---------- commissionAgreements ----------
// At most one `active` agreement per creator — enforced by a partial unique
// index. Changing a rate supersedes the old row and inserts a new active one.
const CommissionAgreementSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      id: { type: String, required: true },
      creatorId: { type: String, required: true, index: true },
      type: { type: String, required: true },
      value: { type: Number, required: true },
      currency: { type: String, required: true, default: "INR" },
      status: { type: String, required: true },
      effectiveFrom: { type: String, required: true },
      supersededAt: String,
      createdByAdminId: { type: String, required: true },
      notes: String,
    },
    { versionKey: false },
  ),
);
CommissionAgreementSchema.index(
  { creatorId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
    name: "ux_commission_one_active_per_creator",
  },
);

export const CommissionAgreementModel: Model<CommissionAgreement> =
  (mongoose.models.CommissionAgreement as Model<CommissionAgreement>) ||
  mongoose.model<CommissionAgreement>(
    "CommissionAgreement",
    CommissionAgreementSchema,
  );

// ---------- referralSessions (keyed by sessionToken) ----------
const ReferralSessionSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true }, // = sessionToken
      sessionToken: { type: String, required: true, unique: true },
      creatorId: { type: String, required: true, index: true },
      landingPage: String,
      campaign: String,
      ipHash: String,
      userAgent: String,
      status: { type: String, required: true, index: true },
      convertedAt: String,
      convertedUserId: String,
      expiresAt: { type: String, required: true, index: true },
      createdAt: { type: String, required: true },
    },
    { versionKey: false },
  ),
);

export const ReferralSessionModel: Model<ReferralSession> =
  (mongoose.models.ReferralSession as Model<ReferralSession>) ||
  mongoose.model<ReferralSession>("ReferralSession", ReferralSessionSchema);

// ---------- creatorRewards ----------
// Unique `paymentId` = one reward per payment. The reward engine inserts with
// `$setOnInsert` upsert so a concurrent webhook race converges instead of
// throwing (loophole §9.7).
const CreatorRewardSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      id: { type: String, required: true },
      creatorId: { type: String, required: true, index: true },
      userId: { type: String, required: true, index: true },
      paymentId: { type: String, required: true, unique: true },
      orderId: String,
      commissionType: { type: String, required: true },
      commissionValue: { type: Number, required: true },
      bootcampPrice: { type: Number, required: true },
      calculatedAmount: { type: Number, required: true },
      currency: { type: String, required: true, default: "INR" },
      status: { type: String, required: true, index: true },
      reversalKind: String,
      reversedReason: String,
      reviewedByAdminId: String,
      reviewedAt: String,
      createdAt: { type: String, required: true },
    },
    { versionKey: false },
  ),
);

export const CreatorRewardModel: Model<CreatorReward> =
  (mongoose.models.CreatorReward as Model<CreatorReward>) ||
  mongoose.model<CreatorReward>("CreatorReward", CreatorRewardSchema);

// ---------- creditLedger (append-only) ----------
const CreditLedgerSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      id: { type: String, required: true },
      creatorId: { type: String, required: true, index: true },
      type: { type: String, required: true },
      amountPaise: { type: Number, required: true },
      currency: { type: String, required: true, default: "INR" },
      referenceType: { type: String, required: true },
      referenceId: { type: String, required: true },
      description: String,
      createdAt: { type: String, required: true },
      createdByActorId: { type: String, required: true },
    },
    { versionKey: false },
  ),
);
CreditLedgerSchema.index(
  { creatorId: 1, createdAt: -1 },
  { name: "ix_ledger_creator_recent" },
);

export const CreditLedgerModel: Model<CreditLedgerEntry> =
  (mongoose.models.CreditLedger as Model<CreditLedgerEntry>) ||
  mongoose.model<CreditLedgerEntry>("CreditLedger", CreditLedgerSchema);

// ---------- payoutRequests ----------
const PayoutRequestSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      id: { type: String, required: true },
      creatorId: { type: String, required: true, index: true },
      amountPaise: { type: Number, required: true },
      currency: { type: String, required: true, default: "INR" },
      grossPaise: { type: Number, required: true },
      tdsPaise: Number,
      netPaise: { type: Number, required: true },
      status: { type: String, required: true, index: true },
      paymentMethod: { type: String, required: true },
      paymentReference: String,
      requestedAt: { type: String, required: true },
      reviewedByAdminId: String,
      reviewedAt: String,
      paidAt: String,
      rejectedReason: String,
    },
    { versionKey: false },
  ),
);

export const PayoutRequestModel: Model<PayoutRequest> =
  (mongoose.models.PayoutRequest as Model<PayoutRequest>) ||
  mongoose.model<PayoutRequest>("PayoutRequest", PayoutRequestSchema);

// ---------- creatorEvents (immutable audit) ----------
const CreatorEventSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      id: { type: String, required: true },
      entityType: { type: String, required: true },
      entityId: { type: String, required: true },
      actorType: { type: String, required: true },
      actorId: String,
      eventType: { type: String, required: true },
      metadata: { type: Schema.Types.Mixed },
      createdAt: { type: String, required: true },
    },
    { versionKey: false },
  ),
);
CreatorEventSchema.index(
  { entityType: 1, entityId: 1, createdAt: -1 },
  { name: "ix_creator_events_entity_recent" },
);

export const CreatorEventModel: Model<CreatorEvent> =
  (mongoose.models.CreatorEvent as Model<CreatorEvent>) ||
  mongoose.model<CreatorEvent>("CreatorEvent", CreatorEventSchema);

/**
 * Strip Mongo's `_id` from a `.lean()` doc. Every creator collection stores its
 * natural key as an explicit domain field too (`creatorId` / `sessionToken` /
 * `id`), so removing `_id` yields the exact domain object — unlike the generic
 * `unwrap`, which would inject a spurious `id` onto the natural-key models.
 */
export function cleanDoc<T>(doc: unknown): T | undefined {
  if (!doc || typeof doc !== "object") return undefined;
  // Spread to a fresh record, drop the Mongo-only `_id`, hand back as T. The
  // caller picks T; every domain field is already present on the lean doc.
  const o: Record<string, unknown> = { ...(doc as Record<string, unknown>) };
  delete o._id;
  return o as T;
}

export function cleanDocs<T>(docs: unknown[]): T[] {
  const out: T[] = [];
  for (const d of docs) {
    const c = cleanDoc<T>(d);
    if (c !== undefined) out.push(c);
  }
  return out;
}
