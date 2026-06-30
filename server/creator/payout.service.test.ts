/**
 * Payout gate + idempotency proofs (§9.6 verified, §9.8 floor, §10.2 N7 order,
 * idempotent processing).
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  CreatorProfileModel,
  CommissionAgreementModel,
  CreditLedgerModel,
  PayoutRequestModel,
} from "@/server/db/creator-models";
import {
  createCreator,
  updateCreatorPaymentDetails,
  verifyCreatorPaymentDetails,
} from "@/server/creator/creator.service";
import { addLedgerEntry, getBalance } from "@/server/creator/ledger.service";
import {
  requestPayout,
  approvePayout,
  processPayout,
  PayoutTransitionError,
} from "@/server/creator/payout.service";

const ADMIN = "u_admin";

beforeAll(async () => {
  await Promise.all([
    CreatorProfileModel.createIndexes(),
    CommissionAgreementModel.createIndexes(),
    CreditLedgerModel.createIndexes(),
    PayoutRequestModel.createIndexes(),
  ]);
});

async function newCreatorWithBalance(balancePaise: number, verified: boolean) {
  const res = await createCreator(
    {
      name: `Payout ${Math.random().toString(36).slice(2, 7)}`,
      email: `p_${Math.random().toString(36).slice(2, 9)}@example.com`,
      commission: { type: "percentage", value: 10 },
    },
    ADMIN,
  );
  if (!res.ok) throw new Error("createCreator failed");
  const creatorId = res.profile.creatorId;
  await updateCreatorPaymentDetails(creatorId, {
    method: "upi",
    accountRef: "creator@upi",
  });
  if (verified) await verifyCreatorPaymentDetails(creatorId, ADMIN);
  if (balancePaise > 0) {
    await addLedgerEntry({
      creatorId,
      type: "credit",
      amountPaise: balancePaise,
      referenceType: "manual_adjustment",
      referenceId: "seed",
      createdByActorId: ADMIN,
    });
  }
  return creatorId;
}

describe("payout gates", () => {
  it("§9.6 blocks payout when payment details are unverified", async () => {
    const creatorId = await newCreatorWithBalance(100_000, false);
    const res = await requestPayout(creatorId, 60_000);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_verified");
  });

  it("blocks payout when no payment details exist", async () => {
    const res0 = await createCreator(
      {
        name: "NoDetails",
        email: `nd_${Math.random().toString(36).slice(2, 9)}@example.com`,
        commission: { type: "percentage", value: 10 },
      },
      ADMIN,
    );
    if (!res0.ok) throw new Error("createCreator failed");
    const res = await requestPayout(res0.profile.creatorId, 60_000);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("no_payment_method");
  });

  it("§9.8 + N7 floor is checked before balance (amount below ₹500 → below_minimum)", async () => {
    const creatorId = await newCreatorWithBalance(0, true); // zero balance
    const res = await requestPayout(creatorId, 100); // ₹1, below floor
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("below_minimum");
  });

  it("blocks payout above available balance", async () => {
    const creatorId = await newCreatorWithBalance(60_000, true);
    const res = await requestPayout(creatorId, 70_000);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("insufficient_balance");
  });

  it("processing is idempotent and debits the ledger once", async () => {
    const creatorId = await newCreatorWithBalance(100_000, true);
    const req = await requestPayout(creatorId, 60_000);
    expect(req.ok).toBe(true);
    if (!req.ok) return;

    await approvePayout(req.payout.id, ADMIN);
    const paid = await processPayout(req.payout.id, ADMIN, {
      paymentReference: "UTR123",
      tdsPaise: 6_000,
    });
    expect(paid.status).toBe("paid");
    expect(paid.netPaise).toBe(54_000); // gross 60k − 6k TDS
    expect(await getBalance(creatorId)).toBe(40_000); // 100k − 60k gross

    // Re-processing throws and never double-debits.
    await expect(
      processPayout(req.payout.id, ADMIN, { paymentReference: "UTR123" }),
    ).rejects.toBeInstanceOf(PayoutTransitionError);
    const debits = await CreditLedgerModel.countDocuments({
      creatorId,
      type: "debit",
    });
    expect(debits).toBe(1);
    expect(await getBalance(creatorId)).toBe(40_000);
  });
});
