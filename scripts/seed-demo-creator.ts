/* eslint-disable no-console */
/**
 * Seed a ready-to-use, populated demo creator so the /creatordashboard and the
 * admin Creator CRM can be explored locally without the invite/activate/email
 * dance. Idempotent — wipes and rebuilds the demo creator on each run.
 *
 * Login (creator dashboard): creator@demo.test / demo  →  /creatordashboard/login
 * Referral link: <APP_URL>/r/demo-creator
 *
 * Run: npx tsx scripts/seed-demo-creator.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { connectMongo } from "../server/db/mongo";
import { UserModel } from "../server/db/models";
import {
  CreatorProfileModel,
  CommissionAgreementModel,
  CreatorRewardModel,
  CreditLedgerModel,
  PayoutRequestModel,
} from "../server/db/creator-models";
import { hashPassword } from "../server/auth/password";
import { setCommissionAgreement } from "../server/creator/commission.service";
import {
  checkAndCreateReward,
  approveReward,
  getRewardByPaymentId,
} from "../server/creator/reward.service";
import {
  updateCreatorPaymentDetails,
  verifyCreatorPaymentDetails,
} from "../server/creator/creator.service";
import mongoose from "mongoose";

const CREATOR_ID = "cr_demo";
const CREATOR_EMAIL = "creator@demo.test";
const CODE = "demo-creator";
const STUDENTS = [
  { id: "usr_demo_ref1", email: "ref1@demo.test", name: "Referred One" },
  { id: "usr_demo_ref2", email: "ref2@demo.test", name: "Referred Two" },
];

async function wipe(): Promise<void> {
  await Promise.all([
    UserModel.deleteOne({ _id: CREATOR_ID }),
    UserModel.deleteMany({ _id: { $in: STUDENTS.map((s) => s.id) } }),
    CreatorProfileModel.deleteOne({ _id: CREATOR_ID }),
    CommissionAgreementModel.deleteMany({ creatorId: CREATOR_ID }),
    CreatorRewardModel.deleteMany({ creatorId: CREATOR_ID }),
    CreditLedgerModel.deleteMany({ creatorId: CREATOR_ID }),
    PayoutRequestModel.deleteMany({ creatorId: CREATOR_ID }),
  ]);
}

async function main(): Promise<void> {
  await connectMongo();
  await wipe();
  const now = new Date().toISOString();

  // Creator user — active + password "demo" so you can log in immediately.
  await UserModel.create({
    _id: CREATOR_ID,
    email: CREATOR_EMAIL,
    passwordHash: await hashPassword("demo"),
    role: "creator",
    name: "Demo Creator",
    plan: "free",
    planType: "free",
    emailVerified: true,
    status: "active",
    createdAt: now,
  });

  // Active profile (skip the pending→active invite flow for local viewing).
  await CreatorProfileModel.create({
    _id: CREATOR_ID,
    creatorId: CREATOR_ID,
    referralCode: CODE,
    status: "active",
    socialLinks: { instagram: "https://instagram.com/democreator" },
    bio: "Demo creator seeded for local exploration.",
    invitedAt: now,
    acceptedAt: now,
    createdByAdminId: "u_root",
    createdAt: now,
  });

  await setCommissionAgreement(
    CREATOR_ID,
    { type: "percentage", value: 15 },
    "u_root",
  );

  // Two attributed students.
  for (const s of STUDENTS) {
    await UserModel.create({
      _id: s.id,
      email: s.email,
      passwordHash: await hashPassword("demo"),
      role: "student",
      name: s.name,
      plan: "premium",
      planType: "premium",
      emailVerified: true,
      status: "active",
      referredByCreatorId: CREATOR_ID,
      createdAt: now,
    });
  }

  // Two Premium purchases → two pending rewards (+ credits). Approve one so the
  // dashboard shows both a lifetime (approved) and a pending figure.
  await checkAndCreateReward({ userId: STUDENTS[0].id, paymentId: "pay_demo_1" });
  await checkAndCreateReward({ userId: STUDENTS[1].id, paymentId: "pay_demo_2" });
  const first = await getRewardByPaymentId("pay_demo_1");
  if (first) await approveReward(first.id, "u_root");

  // Verified payout details so "Request payout" works end-to-end.
  await updateCreatorPaymentDetails(CREATOR_ID, {
    method: "upi",
    accountRef: "democreator@upi",
    accountName: "Demo Creator",
  });
  await verifyCreatorPaymentDetails(CREATOR_ID, "u_root");

  console.log("✔ Seeded demo creator");
  console.log(`  Dashboard login: ${CREATOR_EMAIL} / demo  →  /creatordashboard/login`);
  console.log(`  Referral link:   /r/${CODE}`);
  console.log("  1 approved + 1 pending reward, verified UPI payout details.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
