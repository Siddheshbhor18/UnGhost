import { describe, it, expect, beforeAll } from "vitest";
import {
  CreatorProfileModel,
  CommissionAgreementModel,
  ReferralSessionModel,
  CreatorRewardModel,
  CreditLedgerModel,
  PayoutRequestModel,
  CreatorEventModel,
} from "@/server/db/creator-models";
import { logCreatorEvent } from "@/server/creator/event.service";
import { BOOTCAMP_BASE_PAISE } from "@/server/creator/types";

const now = () => new Date().toISOString();

beforeAll(async () => {
  // Force index build so unique/partial constraints are enforced in-test.
  await Promise.all([
    CreatorProfileModel.createIndexes(),
    CommissionAgreementModel.createIndexes(),
    ReferralSessionModel.createIndexes(),
    CreatorRewardModel.createIndexes(),
    CreditLedgerModel.createIndexes(),
    PayoutRequestModel.createIndexes(),
    CreatorEventModel.createIndexes(),
  ]);
});

describe("creator models — insert + read each collection", () => {
  it("round-trips a creator profile", async () => {
    await CreatorProfileModel.create({
      _id: "u_creator1",
      creatorId: "u_creator1",
      referralCode: "jane-doe",
      status: "pending",
      socialLinks: { instagram: "https://instagram.com/jane" },
      createdByAdminId: "u_admin",
      createdAt: now(),
    });
    const got = await CreatorProfileModel.findById("u_creator1").lean();
    expect(got?.referralCode).toBe("jane-doe");
    expect(got?.status).toBe("pending");
  });

  it("round-trips a commission agreement", async () => {
    await CommissionAgreementModel.create({
      _id: "cagr_1",
      id: "cagr_1",
      creatorId: "u_creator1",
      type: "percentage",
      value: 15,
      currency: "INR",
      status: "active",
      effectiveFrom: now(),
      createdByAdminId: "u_admin",
    });
    const got = await CommissionAgreementModel.findById("cagr_1").lean();
    expect(got?.value).toBe(15);
  });

  it("round-trips a referral session keyed by token", async () => {
    await ReferralSessionModel.create({
      _id: "tok_abc",
      sessionToken: "tok_abc",
      creatorId: "u_creator1",
      status: "active",
      expiresAt: now(),
      createdAt: now(),
    });
    const got = await ReferralSessionModel.findById("tok_abc").lean();
    expect(got?.creatorId).toBe("u_creator1");
  });

  it("round-trips a reward with a frozen commission snapshot", async () => {
    await CreatorRewardModel.create({
      _id: "rw_1",
      id: "rw_1",
      creatorId: "u_creator1",
      userId: "u_student1",
      paymentId: "pay_1",
      commissionType: "percentage",
      commissionValue: 15,
      bootcampPrice: BOOTCAMP_BASE_PAISE,
      calculatedAmount: Math.round(BOOTCAMP_BASE_PAISE * 0.15),
      currency: "INR",
      status: "pending",
      createdAt: now(),
    });
    const got = await CreatorRewardModel.findById("rw_1").lean();
    expect(got?.calculatedAmount).toBe(74985);
    expect(got?.status).toBe("pending");
  });

  it("round-trips a ledger entry", async () => {
    await CreditLedgerModel.create({
      _id: "led_1",
      id: "led_1",
      creatorId: "u_creator1",
      type: "credit",
      amountPaise: 74985,
      currency: "INR",
      referenceType: "reward",
      referenceId: "rw_1",
      createdAt: now(),
      createdByActorId: "system",
    });
    const got = await CreditLedgerModel.findById("led_1").lean();
    expect(got?.amountPaise).toBe(74985);
  });

  it("round-trips a payout request with gross/net fields", async () => {
    await PayoutRequestModel.create({
      _id: "po_1",
      id: "po_1",
      creatorId: "u_creator1",
      amountPaise: 74985,
      currency: "INR",
      grossPaise: 74985,
      netPaise: 74985,
      status: "requested",
      paymentMethod: "upi",
      requestedAt: now(),
    });
    const got = await PayoutRequestModel.findById("po_1").lean();
    expect(got?.netPaise).toBe(74985);
  });

  it("logCreatorEvent appends an immutable event", async () => {
    await logCreatorEvent({
      entityType: "creator",
      entityId: "u_creator1",
      actorType: "admin",
      actorId: "u_admin",
      eventType: "creator.invited",
    });
    const got = await CreatorEventModel.findOne({
      entityId: "u_creator1",
    }).lean();
    expect(got?.eventType).toBe("creator.invited");
  });
});

describe("creator models — loophole-critical unique indexes", () => {
  it("rejects a duplicate reward for the same paymentId (§9.7)", async () => {
    await CreatorRewardModel.create({
      _id: "rw_dupe_a",
      id: "rw_dupe_a",
      creatorId: "u_creator1",
      userId: "u_student1",
      paymentId: "pay_dupe",
      commissionType: "fixed",
      commissionValue: 75000,
      bootcampPrice: BOOTCAMP_BASE_PAISE,
      calculatedAmount: 75000,
      currency: "INR",
      status: "pending",
      createdAt: now(),
    });
    await expect(
      CreatorRewardModel.create({
        _id: "rw_dupe_b",
        id: "rw_dupe_b",
        creatorId: "u_creator1",
        userId: "u_student1",
        paymentId: "pay_dupe",
        commissionType: "fixed",
        commissionValue: 75000,
        bootcampPrice: BOOTCAMP_BASE_PAISE,
        calculatedAmount: 75000,
        currency: "INR",
        status: "pending",
        createdAt: now(),
      }),
    ).rejects.toThrow();
  });

  it("allows only one active agreement per creator (§9.10/partial index)", async () => {
    await CommissionAgreementModel.create({
      _id: "cagr_active_1",
      id: "cagr_active_1",
      creatorId: "u_creator2",
      type: "percentage",
      value: 10,
      currency: "INR",
      status: "active",
      effectiveFrom: now(),
      createdByAdminId: "u_admin",
    });
    await expect(
      CommissionAgreementModel.create({
        _id: "cagr_active_2",
        id: "cagr_active_2",
        creatorId: "u_creator2",
        type: "percentage",
        value: 20,
        currency: "INR",
        status: "active",
        effectiveFrom: now(),
        createdByAdminId: "u_admin",
      }),
    ).rejects.toThrow();
    // A superseded one alongside an active one is fine.
    await CommissionAgreementModel.create({
      _id: "cagr_superseded",
      id: "cagr_superseded",
      creatorId: "u_creator2",
      type: "percentage",
      value: 5,
      currency: "INR",
      status: "superseded",
      effectiveFrom: now(),
      supersededAt: now(),
      createdByAdminId: "u_admin",
    });
    const count = await CommissionAgreementModel.countDocuments({
      creatorId: "u_creator2",
    });
    expect(count).toBe(2);
  });
});
