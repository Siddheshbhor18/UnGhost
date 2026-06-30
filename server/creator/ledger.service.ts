/**
 * Credit ledger — append-only. Balance is ALWAYS derived from the rows, never
 * stored (ground rule §0.11). Direction comes from `type` ("credit" adds,
 * "debit" subtracts); `amountPaise` is always positive.
 *
 * Balance may go negative after a post-payout reversal (§10.2 N1) — that is a
 * real debt, surfaced to admins; future payouts are blocked until it clears.
 * We never auto-claw funds.
 */
import { randomBytes } from "node:crypto";
import { connectMongo } from "@/server/db/mongo";
import { CreditLedgerModel, cleanDocs } from "@/server/db/creator-models";
import {
  CREATOR_CURRENCY,
  type CreditLedgerEntry,
  type LedgerEntryType,
  type LedgerReferenceType,
} from "@/server/creator/types";

export interface AddLedgerEntryInput {
  creatorId: string;
  type: LedgerEntryType;
  amountPaise: number;
  referenceType: LedgerReferenceType;
  referenceId: string;
  description?: string;
  createdByActorId: string;
}

export async function addLedgerEntry(
  input: AddLedgerEntryInput,
): Promise<CreditLedgerEntry> {
  if (input.amountPaise <= 0) {
    throw new Error("ledger amountPaise must be positive");
  }
  await connectMongo();
  const entry: CreditLedgerEntry = {
    id: `led_${randomBytes(8).toString("hex")}`,
    creatorId: input.creatorId,
    type: input.type,
    amountPaise: input.amountPaise,
    currency: CREATOR_CURRENCY,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    description: input.description,
    createdAt: new Date().toISOString(),
    createdByActorId: input.createdByActorId,
  };
  await CreditLedgerModel.create({ _id: entry.id, ...entry });
  return entry;
}

/**
 * Derived balance = SUM(credit) − SUM(debit), in paise. Can be negative.
 */
export async function getBalance(creatorId: string): Promise<number> {
  await connectMongo();
  const rows = await CreditLedgerModel.aggregate<{
    _id: LedgerEntryType;
    total: number;
  }>([
    { $match: { creatorId } },
    { $group: { _id: "$type", total: { $sum: "$amountPaise" } } },
  ]);
  let credit = 0;
  let debit = 0;
  for (const row of rows) {
    if (row._id === "credit") credit = row.total;
    else if (row._id === "debit") debit = row.total;
  }
  return credit - debit;
}

export async function getLedgerHistory(
  creatorId: string,
  limit = 100,
): Promise<CreditLedgerEntry[]> {
  await connectMongo();
  const docs = await CreditLedgerModel.find({ creatorId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return cleanDocs<CreditLedgerEntry>(docs);
}
