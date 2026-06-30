/**
 * Commission agreements — per-creator, admin-negotiated, snapshotted into each
 * reward. Changing a rate supersedes the current active agreement and inserts a
 * new active one (ground rule §0.10). Caps from loophole §9.5 are enforced both
 * at the Zod boundary (`commissionInputSchema`) and defensively here.
 *
 * NOTE: supersede-then-insert is not wrapped in a transaction yet — the partial
 * unique index `ux_commission_one_active_per_creator` guarantees there is never
 * more than one active agreement, and this is a low-frequency admin action.
 * Transactions are added in Phase 9 where Mongo supports them.
 */
import { randomBytes } from "node:crypto";
import { connectMongo } from "@/server/db/mongo";
import {
  CommissionAgreementModel,
  cleanDoc,
  cleanDocs,
} from "@/server/db/creator-models";
import { logCreatorEvent } from "@/server/creator/event.service";
import {
  CREATOR_CURRENCY,
  MAX_COMMISSION_PERCENT,
  BOOTCAMP_BASE_PAISE,
  type CommissionAgreement,
  type CommissionInput,
} from "@/server/creator/types";

function assertWithinCaps(input: CommissionInput): void {
  if (input.type === "percentage") {
    if (input.value < 0 || input.value > MAX_COMMISSION_PERCENT) {
      throw new Error(
        `commission percentage out of range (0–${MAX_COMMISSION_PERCENT})`,
      );
    }
  } else {
    if (input.value <= 0 || input.value > BOOTCAMP_BASE_PAISE) {
      throw new Error(
        `fixed commission out of range (1–${BOOTCAMP_BASE_PAISE} paise)`,
      );
    }
  }
}

export async function getActiveAgreement(
  creatorId: string,
): Promise<CommissionAgreement | undefined> {
  await connectMongo();
  const doc = await CommissionAgreementModel.findOne({
    creatorId,
    status: "active",
  }).lean();
  return cleanDoc<CommissionAgreement>(doc);
}

export async function listAgreementHistory(
  creatorId: string,
): Promise<CommissionAgreement[]> {
  await connectMongo();
  const docs = await CommissionAgreementModel.find({ creatorId })
    .sort({ effectiveFrom: -1 })
    .lean();
  return cleanDocs<CommissionAgreement>(docs);
}

/**
 * Set (or change) a creator's commission. Supersedes the current active
 * agreement, then inserts a new active one. The new agreement is what every
 * future reward snapshots; past rewards are untouched.
 */
export async function setCommissionAgreement(
  creatorId: string,
  input: CommissionInput,
  createdByAdminId: string,
  notes?: string,
): Promise<CommissionAgreement> {
  assertWithinCaps(input);
  await connectMongo();
  const now = new Date().toISOString();

  await CommissionAgreementModel.updateOne(
    { creatorId, status: "active" },
    { $set: { status: "superseded", supersededAt: now } },
  );

  const agreement: CommissionAgreement = {
    id: `cagr_${randomBytes(8).toString("hex")}`,
    creatorId,
    type: input.type,
    value: input.value,
    currency: CREATOR_CURRENCY,
    status: "active",
    effectiveFrom: now,
    createdByAdminId,
    notes,
  };
  await CommissionAgreementModel.create({ _id: agreement.id, ...agreement });

  await logCreatorEvent({
    entityType: "agreement",
    entityId: agreement.id,
    actorType: "admin",
    actorId: createdByAdminId,
    eventType: "agreement.created",
    metadata: { creatorId, type: input.type, value: input.value },
  });

  return agreement;
}
