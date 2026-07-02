/**
 * Proof that the §9 loophole fixes actually hold. Each test maps to a loophole
 * number from referalsys.md.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { UserModel } from "@/server/db/models";
import {
  CreatorProfileModel,
  CommissionAgreementModel,
  CreatorRewardModel,
  CreditLedgerModel,
  ReferralSessionModel,
} from "@/server/db/creator-models";
import { createCreator, terminateCreator } from "@/server/creator/creator.service";
import { setCommissionAgreement } from "@/server/creator/commission.service";
import {
  checkAndCreateReward,
  approveReward,
  rejectReward,
  reverseRewardByPayment,
  getRewardByPaymentId,
} from "@/server/creator/reward.service";
import { getBalance } from "@/server/creator/ledger.service";
import { attachAttribution } from "@/server/creator/referral.service";
import { BOOTCAMP_BASE_PAISE } from "@/server/creator/types";

const ADMIN = "u_admin";

beforeAll(async () => {
  await Promise.all([
    CreatorProfileModel.createIndexes(),
    CommissionAgreementModel.createIndexes(),
    CreatorRewardModel.createIndexes(),
    CreditLedgerModel.createIndexes(),
    ReferralSessionModel.createIndexes(),
  ]);
});

async function newCreator(opts?: { pct?: number; fixed?: number }) {
  const commission =
    opts?.fixed != null
      ? ({ type: "fixed", value: opts.fixed } as const)
      : ({ type: "percentage", value: opts?.pct ?? 15 } as const);
  const res = await createCreator(
    {
      name: `Creator ${Math.random().toString(36).slice(2, 7)}`,
      email: `c_${Math.random().toString(36).slice(2, 9)}@example.com`,
      password: "TestPass1",
      commission,
    },
    ADMIN,
  );
  if (!res.ok) throw new Error(`createCreator failed: ${res.reason}`);
  return res.profile.creatorId;
}

async function newAttributedStudent(creatorId: string) {
  const id = `usr_${Math.random().toString(36).slice(2, 10)}`;
  await UserModel.create({
    _id: id,
    email: `${id}@example.com`,
    role: "student",
    name: "Student",
    referredByCreatorId: creatorId,
    createdAt: new Date().toISOString(),
  });
  return id;
}

describe("reward engine — loophole proofs", () => {
  it("§9.7 idempotent: same paymentId processed twice → one reward, one credit", async () => {
    const creatorId = await newCreator({ pct: 15 });
    const userId = await newAttributedStudent(creatorId);

    const first = await checkAndCreateReward({ userId, paymentId: "pay_x" });
    const second = await checkAndCreateReward({ userId, paymentId: "pay_x" });

    expect(first.created).toBe(true);
    expect(second).toEqual({ created: false, reason: "duplicate" });

    const rewards = await CreatorRewardModel.countDocuments({
      paymentId: "pay_x",
    });
    expect(rewards).toBe(1);
    // 15% of ₹4,999 = 74985 paise, credited exactly once.
    expect(await getBalance(creatorId)).toBe(74985);
  });

  it("§9.1 self-referral: creator's own account purchase earns nothing", async () => {
    const creatorId = await newCreator({ pct: 20 });
    // Attribute the creator's OWN user id to themselves.
    await UserModel.updateOne(
      { _id: creatorId },
      { $set: { referredByCreatorId: creatorId } },
    );
    const res = await checkAndCreateReward({
      userId: creatorId,
      paymentId: "pay_self",
    });
    expect(res).toEqual({ created: false, reason: "self_referral" });
    expect(await getBalance(creatorId)).toBe(0);
  });

  it("§9.9 terminated creator earns nothing; suspended still accrues pending", async () => {
    // terminated
    const term = await newCreator({ pct: 10 });
    const tUser = await newAttributedStudent(term);
    await terminateCreator(term, "left platform", ADMIN);
    const tRes = await checkAndCreateReward({ userId: tUser, paymentId: "pay_t" });
    expect(tRes).toEqual({ created: false, reason: "creator_terminated" });

    // suspended (manually set status) still accrues
    const susp = await newCreator({ pct: 10 });
    const sUser = await newAttributedStudent(susp);
    await CreatorProfileModel.updateOne(
      { _id: susp },
      { $set: { status: "suspended" } },
    );
    const sRes = await checkAndCreateReward({ userId: sUser, paymentId: "pay_s" });
    expect(sRes.created).toBe(true);
    const reward = await getRewardByPaymentId("pay_s");
    expect(reward?.status).toBe("pending");
  });

  it("§0.8 commission snapshot: changing the rate doesn't alter past rewards", async () => {
    const creatorId = await newCreator({ pct: 10 });
    const userId = await newAttributedStudent(creatorId);
    await checkAndCreateReward({ userId, paymentId: "pay_snap" });
    const before = await getRewardByPaymentId("pay_snap");
    expect(before?.commissionValue).toBe(10);
    expect(before?.calculatedAmount).toBe(49990); // 10% of 4,999

    await setCommissionAgreement(creatorId, { type: "percentage", value: 30 }, ADMIN);
    const after = await getRewardByPaymentId("pay_snap");
    expect(after?.commissionValue).toBe(10); // unchanged
    expect(after?.calculatedAmount).toBe(49990);
  });

  it("§9.3 reject offsets the credit → balance returns to zero", async () => {
    const creatorId = await newCreator({ fixed: 75000 });
    const userId = await newAttributedStudent(creatorId);
    const res = await checkAndCreateReward({ userId, paymentId: "pay_rej" });
    expect(res.created).toBe(true);
    expect(await getBalance(creatorId)).toBe(75000);

    const reward = await getRewardByPaymentId("pay_rej");
    const rev = await rejectReward(reward!.id, ADMIN, "ineligible");
    expect(rev.reversed).toBe(true);
    expect(await getBalance(creatorId)).toBe(0);
    expect((await getRewardByPaymentId("pay_rej"))?.status).toBe("rejected");
  });

  it("§9.2 chargeback reverses an approved reward; replay is idempotent", async () => {
    const creatorId = await newCreator({ fixed: 60000 });
    const userId = await newAttributedStudent(creatorId);
    await checkAndCreateReward({ userId, paymentId: "pay_cb" });
    const reward = await getRewardByPaymentId("pay_cb");
    await approveReward(reward!.id, ADMIN);
    expect(await getBalance(creatorId)).toBe(60000);

    const first = await reverseRewardByPayment({
      paymentId: "pay_cb",
      kind: "chargeback",
      reason: "bank dispute",
      actor: { actorType: "webhook" },
    });
    expect(first.reversed).toBe(true);
    expect(await getBalance(creatorId)).toBe(0);

    // Replayed webhook → no second debit.
    const replay = await reverseRewardByPayment({
      paymentId: "pay_cb",
      kind: "chargeback",
      reason: "bank dispute",
      actor: { actorType: "webhook" },
    });
    expect(replay).toEqual({ reversed: false, reason: "already_terminal" });
    expect(await getBalance(creatorId)).toBe(0);
    const debits = await CreditLedgerModel.countDocuments({
      creatorId,
      type: "debit",
    });
    expect(debits).toBe(1);
  });

  it("§10.2 N1 reversal after payout can drive balance negative (a real debt)", async () => {
    const creatorId = await newCreator({ fixed: 50000 });
    const userId = await newAttributedStudent(creatorId);
    await checkAndCreateReward({ userId, paymentId: "pay_neg" });
    // Simulate a payout that drained the balance.
    await CreditLedgerModel.create({
      _id: "led_payout_neg",
      id: "led_payout_neg",
      creatorId,
      type: "debit",
      amountPaise: 50000,
      currency: "INR",
      referenceType: "payout",
      referenceId: "po_neg",
      createdAt: new Date().toISOString(),
      createdByActorId: ADMIN,
    });
    expect(await getBalance(creatorId)).toBe(0);

    // Now a chargeback reverses the already-paid reward → negative.
    const rev = await reverseRewardByPayment({
      paymentId: "pay_neg",
      kind: "chargeback",
      reason: "late dispute",
      actor: { actorType: "webhook" },
    });
    expect(rev.reversed).toBe(true);
    expect(await getBalance(creatorId)).toBe(-50000);
  });

  it("no attribution → no reward", async () => {
    const id = `usr_${Math.random().toString(36).slice(2, 10)}`;
    await UserModel.create({
      _id: id,
      email: `${id}@example.com`,
      role: "student",
      name: "Orphan",
      createdAt: new Date().toISOString(),
    });
    const res = await checkAndCreateReward({ userId: id, paymentId: "pay_orphan" });
    expect(res).toEqual({ created: false, reason: "no_attribution" });
  });
});

describe("referral attribution — loophole proofs", () => {
  it("§9.10 attribution uses expiresAt, not swept status; first-touch is permanent", async () => {
    const creatorId = await newCreator({ pct: 10 });
    const userId = await newAttributedStudent(creatorId); // already attributed
    // A second, valid session must not overwrite the first attribution.
    await ReferralSessionModel.create({
      _id: "tok_second",
      sessionToken: "tok_second",
      creatorId: "cr_other",
      status: "active",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    const res = await attachAttribution(userId, "tok_second");
    expect(res).toEqual({ attributed: false, reason: "already_attributed" });
    const user = await UserModel.findById(userId).lean();
    expect(user?.referredByCreatorId).toBe(creatorId);
  });

  it("§9.10 a status:'expired' session whose expiresAt is still future STILL attributes", async () => {
    const creatorId = await newCreator({ pct: 10 });
    const id = `usr_${Math.random().toString(36).slice(2, 10)}`;
    await UserModel.create({
      _id: id,
      email: `${id}@example.com`,
      role: "student",
      name: "Fresh",
      createdAt: new Date().toISOString(),
    });
    // Cron swept it to 'expired' prematurely, but TTL is still in the future.
    await ReferralSessionModel.create({
      _id: "tok_swept",
      sessionToken: "tok_swept",
      creatorId,
      status: "expired",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    const res = await attachAttribution(id, "tok_swept");
    expect(res).toEqual({ attributed: true, creatorId });
  });

  it("§9.10 a session past its expiresAt does NOT attribute", async () => {
    const creatorId = await newCreator({ pct: 10 });
    const id = `usr_${Math.random().toString(36).slice(2, 10)}`;
    await UserModel.create({
      _id: id,
      email: `${id}@example.com`,
      role: "student",
      name: "Late",
      createdAt: new Date().toISOString(),
    });
    await ReferralSessionModel.create({
      _id: "tok_old",
      sessionToken: "tok_old",
      creatorId,
      status: "active",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date().toISOString(),
    });
    const res = await attachAttribution(id, "tok_old");
    expect(res).toEqual({ attributed: false, reason: "expired" });
  });
});
