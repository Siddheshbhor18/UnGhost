/**
 * Payouts — a creator withdraws their available balance; an admin processes it,
 * which writes the ledger debit. Append-only ledger means the debit IS the
 * record of money leaving (ground rule §0.11).
 *
 * Gate order on `requestPayout` (loophole §10.2 N7):
 *   1. payment details admin-verified (§9.6)
 *   2. amount ≥ MIN_PAYOUT_PAISE (§9.8)
 *   3. amount ≤ available balance
 *
 * TDS is recorded manually at processing time (§9.4): `grossPaise` is the
 * earning withdrawn, `netPaise = gross − tds`, and the ledger debit always
 * equals `grossPaise`.
 */
import { randomBytes } from "node:crypto";
import { connectMongo } from "@/server/db/mongo";
import { PayoutRequestModel, cleanDoc, cleanDocs } from "@/server/db/creator-models";
import { getCreatorById } from "@/server/creator/creator.service";
import { getBalance, addLedgerEntry } from "@/server/creator/ledger.service";
import { logCreatorEvent } from "@/server/creator/event.service";
import {
  CREATOR_CURRENCY,
  minPayoutPaise,
  type PayoutRequest,
  type PayoutStatus,
} from "@/server/creator/types";

export type RequestPayoutResult =
  | { ok: true; payout: PayoutRequest }
  | {
      ok: false;
      reason:
        | "no_payment_method"
        | "not_verified"
        | "below_minimum"
        | "insufficient_balance";
      detail?: { minPaise?: number; balancePaise?: number };
    };

export async function requestPayout(
  creatorId: string,
  amountPaise: number,
): Promise<RequestPayoutResult> {
  await connectMongo();
  const creator = await getCreatorById(creatorId);
  const details = creator?.paymentDetails;

  // Gate 1 — verified payment details (§9.6).
  if (!details) return { ok: false, reason: "no_payment_method" };
  if (!details.verified) return { ok: false, reason: "not_verified" };

  // Gate 2 — minimum floor (§9.8).
  const floor = minPayoutPaise();
  if (amountPaise < floor) {
    return { ok: false, reason: "below_minimum", detail: { minPaise: floor } };
  }

  // Gate 3 — sufficient balance.
  const balance = await getBalance(creatorId);
  if (amountPaise > balance) {
    return {
      ok: false,
      reason: "insufficient_balance",
      detail: { balancePaise: balance },
    };
  }

  const payout: PayoutRequest = {
    id: `po_${randomBytes(8).toString("hex")}`,
    creatorId,
    amountPaise,
    currency: CREATOR_CURRENCY,
    grossPaise: amountPaise,
    netPaise: amountPaise,
    status: "requested",
    paymentMethod: details.method,
    requestedAt: new Date().toISOString(),
  };
  await PayoutRequestModel.create({ _id: payout.id, ...payout });

  await logCreatorEvent({
    entityType: "payout",
    entityId: payout.id,
    actorType: "creator",
    actorId: creatorId,
    eventType: "payout.requested",
    metadata: { amountPaise },
  });
  return { ok: true, payout };
}

export async function getPayoutById(
  payoutId: string,
): Promise<PayoutRequest | undefined> {
  await connectMongo();
  const doc = await PayoutRequestModel.findById(payoutId).lean();
  return cleanDoc<PayoutRequest>(doc);
}

export async function listPayouts(creatorId: string): Promise<PayoutRequest[]> {
  await connectMongo();
  const docs = await PayoutRequestModel.find({ creatorId })
    .sort({ requestedAt: -1 })
    .lean();
  return cleanDocs<PayoutRequest>(docs);
}

export async function listAllPayouts(
  status?: PayoutStatus,
): Promise<PayoutRequest[]> {
  await connectMongo();
  const q: Record<string, unknown> = {};
  if (status) q.status = status;
  const docs = await PayoutRequestModel.find(q)
    .sort({ requestedAt: 1 })
    .lean();
  return cleanDocs<PayoutRequest>(docs);
}

export class PayoutTransitionError extends Error {}

export async function approvePayout(
  payoutId: string,
  adminId: string,
): Promise<PayoutRequest> {
  await connectMongo();
  const updated = await PayoutRequestModel.findOneAndUpdate(
    { _id: payoutId, status: "requested" },
    {
      $set: {
        status: "approved",
        reviewedByAdminId: adminId,
        reviewedAt: new Date().toISOString(),
      },
    },
    { returnDocument: "after" },
  ).lean();
  const payout = cleanDoc<PayoutRequest>(updated);
  if (!payout) {
    throw new PayoutTransitionError("payout not found or not in requested state");
  }
  await logCreatorEvent({
    entityType: "payout",
    entityId: payoutId,
    actorType: "admin",
    actorId: adminId,
    eventType: "payout.approved",
  });
  return payout;
}

export async function rejectPayout(
  payoutId: string,
  adminId: string,
  reason: string,
): Promise<PayoutRequest> {
  await connectMongo();
  const updated = await PayoutRequestModel.findOneAndUpdate(
    { _id: payoutId, status: { $in: ["requested", "approved"] } },
    {
      $set: {
        status: "rejected",
        rejectedReason: reason,
        reviewedByAdminId: adminId,
        reviewedAt: new Date().toISOString(),
      },
    },
    { returnDocument: "after" },
  ).lean();
  const payout = cleanDoc<PayoutRequest>(updated);
  if (!payout) {
    throw new PayoutTransitionError("payout not found or not rejectable");
  }
  await logCreatorEvent({
    entityType: "payout",
    entityId: payoutId,
    actorType: "admin",
    actorId: adminId,
    eventType: "payout.rejected",
    metadata: { reason },
  });
  return payout;
}

export interface ProcessPayoutInput {
  paymentReference: string;
  tdsPaise?: number;
}

/**
 * Mark an approved payout paid + write the ledger debit (= grossPaise). The
 * status flip is the idempotency gate: only the call that flips `approved → paid`
 * writes the debit, so a double-submit can't double-debit.
 */
export async function processPayout(
  payoutId: string,
  adminId: string,
  input: ProcessPayoutInput,
): Promise<PayoutRequest> {
  await connectMongo();
  const current = await getPayoutById(payoutId);
  if (!current) throw new PayoutTransitionError("payout not found");
  if (current.status !== "approved") {
    throw new PayoutTransitionError("only an approved payout can be processed");
  }

  const tdsPaise = input.tdsPaise ?? 0;
  if (tdsPaise < 0 || tdsPaise > current.grossPaise) {
    throw new PayoutTransitionError("invalid TDS amount");
  }
  const netPaise = current.grossPaise - tdsPaise;
  const now = new Date().toISOString();

  const res = await PayoutRequestModel.updateOne(
    { _id: payoutId, status: "approved" },
    {
      $set: {
        status: "paid",
        paymentReference: input.paymentReference,
        tdsPaise: input.tdsPaise,
        netPaise,
        paidAt: now,
        reviewedByAdminId: adminId,
        reviewedAt: now,
      },
    },
  );
  if ((res.modifiedCount ?? 0) === 0) {
    throw new PayoutTransitionError("payout already processed");
  }

  // Ledger debit = gross earning withdrawn. TDS is a tax split recorded on the
  // payout, not a separate ledger movement (§9.4).
  await addLedgerEntry({
    creatorId: current.creatorId,
    type: "debit",
    amountPaise: current.grossPaise,
    referenceType: "payout",
    referenceId: payoutId,
    description: `Payout ${payoutId} (ref ${input.paymentReference})`,
    createdByActorId: adminId,
  });

  await logCreatorEvent({
    entityType: "payout",
    entityId: payoutId,
    actorType: "admin",
    actorId: adminId,
    eventType: "payout.paid",
    metadata: { grossPaise: current.grossPaise, tdsPaise, netPaise },
  });

  const paid = await getPayoutById(payoutId);
  if (!paid) throw new PayoutTransitionError("payout vanished after processing");
  return paid;
}
