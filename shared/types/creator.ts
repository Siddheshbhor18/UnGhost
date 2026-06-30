/**
 * Creator-platform domain types — pure type-level + constant-level definitions
 * shared by `server/` (services, models) and `components/` (admin + creator
 * dashboard UIs). Lives under `shared/` so the `eslint-plugin-boundaries` rule
 * (`components` → only `components`/`shared`) is satisfied.
 *
 * Anything that needs a Node runtime (Zod schemas that gate API bodies,
 * `process.env` reads) lives in `server/creator/types.ts`, which re-exports
 * everything below so existing server/app callers don't need to change.
 *
 * Mirrors the 7 collections in `referalsys.md` §3 (as amended by §10.3).
 * Money is always paise (integer). INR only. Commission is snapshotted into
 * each reward so later agreement changes never rewrite history.
 */
import { PLAN_PRICING, type SubscriptionPlan } from "@/shared/types";

// ── Constants (no magic numbers) ─────────────────────────────────────────────

/** Commission base = the pre-GST Premium price, in paise (₹4,999 → 499900). */
export const BOOTCAMP_BASE_PAISE = PLAN_PRICING.premium.amountINR * 100;

/** Max negotiable commission percentage. Matches the legacy Partner cap so we
 *  never introduce a second convention (loophole §9.5). */
export const MAX_COMMISSION_PERCENT = 50;

/** Default minimum payout (₹500). Configurable via `MIN_PAYOUT_PAISE` env
 *  (loophole §9.8). Provider floor is ₹1 = 100 paise. */
export const DEFAULT_MIN_PAYOUT_PAISE = 50_000;

/** Referral session / cookie lifetime. */
export const REFERRAL_SESSION_TTL_DAYS = 30;

/** Only these plans ever generate a creator reward. Job products never do
 *  (ground rule §0.5). */
export const REFERRAL_ELIGIBLE_PLANS: readonly SubscriptionPlan[] = ["premium"];

/** Currency is INR everywhere for now; kept as a literal for forward-compat. */
export const CREATOR_CURRENCY = "INR" as const;
export type Currency = typeof CREATOR_CURRENCY;

// ── Enums ────────────────────────────────────────────────────────────────────

export type CreatorStatus = "pending" | "active" | "suspended" | "terminated";
export type CommissionType = "percentage" | "fixed";
export type CommissionStatus = "active" | "superseded";
export type ReferralSessionStatus = "active" | "converted" | "expired";

/** Reward lifecycle. `pending → approved | rejected`, `approved → reversed`.
 *  `rejected` / `reversed` are terminal (loophole §9.2/§9.3, §10.3). */
export type RewardStatus = "pending" | "approved" | "rejected" | "reversed";

/** Why a reward left the payable set. `rejected` = admin declined a pending
 *  reward; `refund`/`chargeback` = money reversed after the fact. One code
 *  path (`reverseReward`) handles all three (§10.2 N5). */
export type ReversalKind = "rejected" | "refund" | "chargeback";

export type LedgerEntryType = "credit" | "debit";
export type LedgerReferenceType =
  | "reward"
  | "payout"
  | "manual_adjustment"
  | "reward_reversal"
  | "refund"
  | "chargeback";

export type PayoutStatus =
  | "requested"
  | "approved"
  | "processing"
  | "paid"
  | "rejected";
export type PaymentMethod = "bank_transfer" | "upi";

export type CreatorEventEntityType =
  | "creator"
  | "agreement"
  | "reward"
  | "payout"
  | "referral_session";
export type CreatorEventActorType =
  | "system"
  | "admin"
  | "webhook"
  | "creator"
  | "cron";

// ── Collection document shapes ───────────────────────────────────────────────

export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  twitter?: string;
}

/** Self-entered payout destination. `verified` flips only after an admin checks
 *  it; payouts are blocked until then (loophole §9.6). */
export interface CreatorPaymentDetails {
  method: PaymentMethod;
  /** Account number (bank_transfer) or VPA (upi). */
  accountRef: string;
  accountName?: string;
  ifsc?: string;
  verified: boolean;
  verifiedByAdminId?: string;
  verifiedAt?: string;
}

export interface CreatorProfile {
  /** Equals `User._id` of the role:"creator" user. */
  creatorId: string;
  /** Unique, immutable, URL-safe slug. */
  referralCode: string;
  status: CreatorStatus;
  socialLinks: SocialLinks;
  bio?: string;
  paymentDetails?: CreatorPaymentDetails;
  invitedAt?: string;
  acceptedAt?: string;
  suspendedAt?: string;
  suspendedReason?: string;
  terminatedAt?: string;
  createdByAdminId: string;
  createdAt: string;
}

export interface CommissionAgreement {
  id: string;
  creatorId: string;
  type: CommissionType;
  /** Percent (0–50) when `type:"percentage"`, else fixed paise (0 < v ≤ base). */
  value: number;
  currency: Currency;
  status: CommissionStatus;
  effectiveFrom: string;
  supersededAt?: string;
  createdByAdminId: string;
  notes?: string;
}

export interface ReferralSession {
  /** Unique random hex — the value stored in the HttpOnly `ug_ref` cookie. */
  sessionToken: string;
  creatorId: string;
  landingPage?: string;
  campaign?: string;
  ipHash?: string;
  userAgent?: string;
  status: ReferralSessionStatus;
  convertedAt?: string;
  convertedUserId?: string;
  /** Authoritative expiry. Signup attribution checks THIS, not `status`
   *  (loophole §9.10). The sweep cron only flips `status` for housekeeping. */
  expiresAt: string;
  createdAt: string;
}

export interface CreatorReward {
  id: string;
  creatorId: string;
  userId: string;
  /** Unique — one reward per payment (idempotent, loophole §9.7). */
  paymentId: string;
  orderId?: string;
  // ── immutable commission snapshot ──
  commissionType: CommissionType;
  commissionValue: number;
  bootcampPrice: number; // paise
  calculatedAmount: number; // paise
  currency: Currency;
  status: RewardStatus;
  /** Set when the reward leaves `pending`/`approved`. */
  reversalKind?: ReversalKind;
  reversedReason?: string;
  reviewedByAdminId?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  creatorId: string;
  type: LedgerEntryType;
  /** Always positive; direction comes from `type`. */
  amountPaise: number;
  currency: Currency;
  referenceType: LedgerReferenceType;
  referenceId: string;
  description?: string;
  createdAt: string;
  createdByActorId: string;
}

export interface PayoutRequest {
  id: string;
  creatorId: string;
  /** The creator-facing amount = gross earning being withdrawn (paise). */
  amountPaise: number;
  currency: Currency;
  /** Gross = `amountPaise`; net = gross − tds. TDS recorded manually at
   *  processing time (loophole §9.4). Ledger debit always equals `grossPaise`. */
  grossPaise: number;
  tdsPaise?: number;
  netPaise: number;
  status: PayoutStatus;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  requestedAt: string;
  reviewedByAdminId?: string;
  reviewedAt?: string;
  paidAt?: string;
  rejectedReason?: string;
}

export interface CreatorEvent {
  id: string;
  entityType: CreatorEventEntityType;
  entityId: string;
  actorType: CreatorEventActorType;
  actorId?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
