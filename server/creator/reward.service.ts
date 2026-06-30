/**
 * Reward engine — turns a qualifying purchase by an attributed student into a
 * pending reward + an immediate credit, and handles every way a reward can
 * leave the payable set (admin reject, refund, chargeback).
 *
 * Loophole fixes baked in:
 *   §9.1  self-referral — a creator never earns on their own account's purchase.
 *   §9.7  idempotency — reward creation relies on the unique `paymentId` index
 *         (create + catch E11000), never check-then-insert.
 *   §9.9  inactive creator — `terminated` blocks accrual; `suspended` still
 *         accrues a pending reward (attribution is permanent).
 *   §9.2/§9.3  reversal — one primitive (`reverseReward`) offsets the credit
 *         with a debit for reject / refund / chargeback, idempotently.
 *
 * The commission rate is snapshotted into each reward, so later agreement
 * changes never rewrite history (ground rule §0.8).
 */
import { randomBytes } from "node:crypto";
import { connectMongo } from "@/server/db/mongo";
import { getUserById } from "@/server/store";
import { ProcessedTxnModel } from "@/server/db/models";
import { CreatorRewardModel, cleanDoc, cleanDocs } from "@/server/db/creator-models";
import { getCreatorById } from "@/server/creator/creator.service";
import { getActiveAgreement } from "@/server/creator/commission.service";
import { addLedgerEntry } from "@/server/creator/ledger.service";
import { logCreatorEvent } from "@/server/creator/event.service";
import {
  BOOTCAMP_BASE_PAISE,
  CREATOR_CURRENCY,
  type CreatorReward,
  type CommissionAgreement,
  type ReversalKind,
  type RewardStatus,
  type CreatorEventActorType,
} from "@/server/creator/types";

/**
 * Commission in paise for one qualifying sale. `basePaise` is the pre-GST
 * amount the buyer paid (e.g. a ₹5,000 course or the ₹11,999 bundle); for a
 * percentage agreement the commission is that percentage of the base, for a
 * fixed agreement it is the flat amount regardless of base.
 */
export function computeCommission(
  agreement: CommissionAgreement,
  basePaise: number,
): number {
  if (agreement.type === "percentage") {
    return Math.round((basePaise * agreement.value) / 100);
  }
  return Math.round(agreement.value); // fixed paise
}

export interface CheckAndCreateRewardInput {
  userId: string;
  paymentId: string;
  orderId?: string;
  /** The gross amount actually charged (incl. GST). Context/audit only. */
  amountPaise?: number;
  /** Pre-GST commission base for this sale. Defaults to the legacy premium
   *  base (₹4,999) when omitted (the grandfathered premium hook). */
  basePaise?: number;
}

export type CreateRewardResult =
  | { created: true; reward: CreatorReward }
  | {
      created: false;
      reason:
        | "no_attribution"
        | "self_referral"
        | "no_creator"
        | "creator_terminated"
        | "no_agreement"
        | "duplicate";
    };

export async function checkAndCreateReward(
  input: CheckAndCreateRewardInput,
): Promise<CreateRewardResult> {
  await connectMongo();
  const user = await getUserById(input.userId);
  const creatorId = user?.referredByCreatorId;
  if (!creatorId) return { created: false, reason: "no_attribution" };

  // §9.1 — same account can't earn on its own purchase.
  if (creatorId === input.userId) {
    await logCreatorEvent({
      entityType: "reward",
      entityId: input.paymentId,
      actorType: "system",
      eventType: "reward.skipped_self_referral",
      metadata: { creatorId, userId: input.userId },
    });
    return { created: false, reason: "self_referral" };
  }

  const creator = await getCreatorById(creatorId);
  if (!creator) return { created: false, reason: "no_creator" };

  // §9.9 — terminated earns nothing; suspended still accrues (pending).
  if (creator.status === "terminated") {
    await logCreatorEvent({
      entityType: "reward",
      entityId: input.paymentId,
      actorType: "system",
      eventType: "reward.skipped_creator_terminated",
      metadata: { creatorId, userId: input.userId },
    });
    return { created: false, reason: "creator_terminated" };
  }

  const agreement = await getActiveAgreement(creatorId);
  if (!agreement) return { created: false, reason: "no_agreement" };

  const basePaise = input.basePaise ?? BOOTCAMP_BASE_PAISE;
  const calculatedAmount = computeCommission(agreement, basePaise);
  const now = new Date().toISOString();
  const reward: CreatorReward = {
    id: `rw_${randomBytes(8).toString("hex")}`,
    creatorId,
    userId: input.userId,
    paymentId: input.paymentId,
    orderId: input.orderId,
    commissionType: agreement.type,
    commissionValue: agreement.value,
    bootcampPrice: basePaise,
    calculatedAmount,
    currency: CREATOR_CURRENCY,
    status: "pending",
    createdAt: now,
  };

  // §9.7 — the unique paymentId index is the idempotency gate. A concurrent
  // webhook race loses here and we skip cleanly instead of throwing upward.
  try {
    await CreatorRewardModel.create({ _id: reward.id, ...reward });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === 11000) {
      return { created: false, reason: "duplicate" };
    }
    throw err;
  }

  // Credit lands immediately so the creator sees it (§7 decision). Only the
  // winner of the unique-index race reaches this line.
  await addLedgerEntry({
    creatorId,
    type: "credit",
    amountPaise: calculatedAmount,
    referenceType: "reward",
    referenceId: reward.id,
    description: `Reward for payment ${input.paymentId}`,
    createdByActorId: "system",
  });

  await logCreatorEvent({
    entityType: "reward",
    entityId: reward.id,
    actorType: "system",
    eventType: "reward.created",
    metadata: { creatorId, userId: input.userId, calculatedAmount },
  });

  return { created: true, reward };
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getRewardByPaymentId(
  paymentId: string,
): Promise<CreatorReward | undefined> {
  await connectMongo();
  const doc = await CreatorRewardModel.findOne({ paymentId }).lean();
  return cleanDoc<CreatorReward>(doc);
}

export interface ListRewardsOptions {
  status?: RewardStatus;
  creatorId?: string;
  limit?: number;
}

export async function listRewards(
  opts: ListRewardsOptions = {},
): Promise<CreatorReward[]> {
  await connectMongo();
  const q: Record<string, unknown> = {};
  if (opts.status) q.status = opts.status;
  if (opts.creatorId) q.creatorId = opts.creatorId;
  const docs = await CreatorRewardModel.find(q)
    .sort({ createdAt: -1 })
    .limit(opts.limit ?? 200)
    .lean();
  return cleanDocs<CreatorReward>(docs);
}

// ── Transitions ──────────────────────────────────────────────────────────────

export class RewardTransitionError extends Error {}

/** pending → approved. Ledger is untouched (the credit already exists). */
export async function approveReward(
  rewardId: string,
  adminId: string,
): Promise<CreatorReward> {
  await connectMongo();
  const updated = await CreatorRewardModel.findOneAndUpdate(
    { _id: rewardId, status: "pending" },
    {
      $set: {
        status: "approved",
        reviewedByAdminId: adminId,
        reviewedAt: new Date().toISOString(),
      },
    },
    { returnDocument: "after" },
  ).lean();
  const reward = cleanDoc<CreatorReward>(updated);
  if (!reward) {
    throw new RewardTransitionError("reward not found or not in pending state");
  }
  await logCreatorEvent({
    entityType: "reward",
    entityId: rewardId,
    actorType: "admin",
    actorId: adminId,
    eventType: "reward.approved",
  });
  return reward;
}

interface Actor {
  actorType: CreatorEventActorType;
  actorId?: string;
}

export type ReverseResult =
  | { reversed: true; creatorId: string; amountPaise: number }
  | { reversed: false; reason: "no_reward" | "already_terminal" };

/**
 * The single offsetting primitive (§9.2/§9.3/§10.2 N5). Flips a pending/approved
 * reward to a terminal state and writes a debit equal to the original credit.
 *
 * Idempotent (§10.2 N3/N4): the status flip is a conditional update; only the
 * caller that actually flips `{pending|approved}` → terminal writes the debit.
 * A replayed refund/chargeback webhook sees `already_terminal` and no-ops.
 */
async function reverseRewardWhere(
  query: Record<string, unknown>,
  kind: ReversalKind,
  reason: string,
  actor: Actor,
): Promise<ReverseResult> {
  await connectMongo();
  const reward = cleanDoc<CreatorReward>(
    await CreatorRewardModel.findOne(query).lean(),
  );
  if (!reward) return { reversed: false, reason: "no_reward" };
  if (reward.status === "rejected" || reward.status === "reversed") {
    return { reversed: false, reason: "already_terminal" };
  }

  const nextStatus: RewardStatus = kind === "rejected" ? "rejected" : "reversed";
  const refType = kind === "rejected" ? "reward_reversal" : kind;
  const now = new Date().toISOString();

  const res = await CreatorRewardModel.updateOne(
    { _id: reward.id, status: { $in: ["pending", "approved"] } },
    {
      $set: {
        status: nextStatus,
        reversalKind: kind,
        reversedReason: reason,
        reviewedByAdminId: actor.actorType === "admin" ? actor.actorId : undefined,
        reviewedAt: now,
      },
    },
  );
  if ((res.modifiedCount ?? 0) === 0) {
    return { reversed: false, reason: "already_terminal" };
  }

  await addLedgerEntry({
    creatorId: reward.creatorId,
    type: "debit",
    amountPaise: reward.calculatedAmount,
    referenceType: refType,
    referenceId: reward.id,
    description: `${kind} of reward ${reward.id} (payment ${reward.paymentId})`,
    createdByActorId: actor.actorId ?? actor.actorType,
  });

  await logCreatorEvent({
    entityType: "reward",
    entityId: reward.id,
    actorType: actor.actorType,
    actorId: actor.actorId,
    eventType: `reward.${kind}`,
    metadata: { paymentId: reward.paymentId, amountPaise: reward.calculatedAmount },
  });

  return {
    reversed: true,
    creatorId: reward.creatorId,
    amountPaise: reward.calculatedAmount,
  };
}

/** pending → rejected (admin declines a pending reward). Writes the offset. */
export async function rejectReward(
  rewardId: string,
  adminId: string,
  reason: string,
): Promise<ReverseResult> {
  return reverseRewardWhere({ _id: rewardId }, "rejected", reason, {
    actorType: "admin",
    actorId: adminId,
  });
}

export interface ReverseByPaymentInput {
  paymentId: string;
  kind: Extract<ReversalKind, "refund" | "chargeback">;
  reason: string;
  actor: Actor;
}

/**
 * Reverse a reward because money moved back (admin refund or bank chargeback).
 * Keyed by `paymentId` so the payment webhooks / admin refund route can call it
 * with the same id the reward was created from. No reward (or already terminal)
 * → safe no-op.
 */
export async function reverseRewardByPayment(
  input: ReverseByPaymentInput,
): Promise<ReverseResult> {
  return reverseRewardWhere(
    { paymentId: input.paymentId },
    input.kind,
    input.reason,
    input.actor,
  );
}

/**
 * Reconciliation backstop (§10.2 N6). The reward hook in `fulfilPremiumPurchase`
 * is best-effort, so a transient failure could leave an attributed purchase
 * without its reward. This scans recent successful premium charges and creates
 * any missing reward — idempotent via the unique paymentId index, so re-running
 * is always safe. Meant to run on a daily cron.
 */
export async function reconcileMissingRewards(
  limit = 500,
): Promise<{ scanned: number; created: number }> {
  await connectMongo();
  const txns = await ProcessedTxnModel.find({
    plan: "premium",
    status: "success",
    amountPaise: { $gt: 0 }, // exclude negative-amount refund rows
  })
    .sort({ processedAt: -1 })
    .limit(limit)
    .lean();

  let created = 0;
  for (const txn of txns) {
    const paymentId = String(txn._id);
    const exists = await CreatorRewardModel.exists({ paymentId });
    if (exists) continue;
    const res = await checkAndCreateReward({
      userId: txn.userId,
      paymentId,
      orderId: txn.orderId,
      amountPaise: txn.amountPaise,
    });
    if (res.created) created++;
  }
  return { scanned: txns.length, created };
}
