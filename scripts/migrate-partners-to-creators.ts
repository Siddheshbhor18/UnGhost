/* eslint-disable no-console */
/**
 * Migration: legacy Partner system → Creator system (one-way, additive).
 *
 * For every Partner row this mirrors a creator into the new platform:
 *   1. Creator User   — role:"creator", email = contactEmail, name, no password,
 *                       emailVerified:false, status:"active". Created only when
 *                       no user already owns that email.
 *   2. CreatorProfile — status = partner.active ? "active" : "suspended",
 *                       referralCode derived from partner.code via the creator
 *                       service's generateReferralCode (uniqueness-guaranteed),
 *                       createdByAdminId:"migration".
 *   3. CommissionAgreement — percentage = min(partner.commissionPct, cap), via
 *                       setCommissionAgreement (so it snapshots like any other).
 *   4. Attribution backfill — users whose referrerPartnerId === partner.id and
 *                       who have NO referredByCreatorId yet get the mirrored
 *                       creatorId. Immutable first-touch: an existing
 *                       referredByCreatorId is NEVER overwritten, and
 *                       referrerPartnerId is left untouched.
 *
 * Idempotency: each migrated Partner is stamped with `migratedToCreatorId`, and
 * every sub-step is independently guarded (skip if the User / profile / active
 * agreement / pointer already exists). A partial prior run therefore resumes
 * cleanly, and a clean re-run is a pure no-op (no duplicate users, profiles, or
 * agreements). No Partner data is ever deleted; the only Partner write is the
 * `migratedToCreatorId` stamp.
 *
 * Conflicts: if a partner's contactEmail already belongs to a NON-creator
 * account (student/recruiter/admin) the partner is skipped — we never convert
 * an existing account into a creator. Reported in the summary, no data touched.
 *
 * Usage:
 *   npx tsx scripts/migrate-partners-to-creators.ts             # APPLY (writes)
 *   npx tsx scripts/migrate-partners-to-creators.ts --dry-run   # preview only
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import { PartnerModel, UserModel } from "../server/db/models";
import { CreatorProfileModel } from "../server/db/creator-models";
import { listPartners, getUserByEmail } from "../server/store";
import {
  generateReferralCode,
  getCreatorById,
} from "../server/creator/creator.service";
import {
  getActiveAgreement,
  setCommissionAgreement,
} from "../server/creator/commission.service";
import { MAX_COMMISSION_PERCENT } from "../server/creator/types";
import type { CommissionInput, CreatorProfile } from "../server/creator/types";
import type { Partner } from "../shared/types";

const DRY_RUN = process.argv.includes("--dry-run");
/** Synthetic admin actor recorded on every creator artifact this script mints. */
const MIGRATION_ACTOR = "migration";

interface Summary {
  scanned: number;
  migrated: number;
  usersBackfilled: number;
  skipped: number;
  conflicts: number;
}

/**
 * Resolve the creatorId a partner maps to. Returns `null` when the partner's
 * email is already owned by a non-creator account (hard conflict). `isNew`
 * signals that a creator User still has to be minted.
 */
async function resolveCreatorTarget(
  partner: Partner,
): Promise<{ creatorId: string; isNew: boolean } | null> {
  if (partner.migratedToCreatorId) {
    return { creatorId: partner.migratedToCreatorId, isNew: false };
  }
  const email = partner.contactEmail.trim().toLowerCase();
  const existing = await getUserByEmail(email);
  if (!existing) {
    return { creatorId: `cr_${randomBytes(8).toString("hex")}`, isNew: true };
  }
  if (existing.role !== "creator") return null; // never convert an existing account
  return { creatorId: existing.id, isNew: false };
}

/**
 * Fill `referredByCreatorId` for users attributed to this partner that don't
 * have a creator attribution yet. `: null` matches both missing and null and
 * never matches an existing non-null value, so first-touch is preserved.
 */
async function backfillAttribution(
  partnerId: string,
  creatorId: string,
  summary: Summary,
): Promise<void> {
  const filter = { referrerPartnerId: partnerId, referredByCreatorId: null };
  if (DRY_RUN) {
    const n = await UserModel.countDocuments(filter);
    if (n > 0) {
      console.log(`    ↳ would backfill ${n} user(s) → referredByCreatorId=${creatorId}`);
    }
    summary.usersBackfilled += n;
    return;
  }
  const res = await UserModel.updateMany(filter, {
    $set: { referredByCreatorId: creatorId },
  });
  if (res.modifiedCount > 0) {
    console.log(`    ↳ backfilled ${res.modifiedCount} user(s) → referredByCreatorId=${creatorId}`);
  }
  summary.usersBackfilled += res.modifiedCount;
}

/** Create the creator User / profile / agreement that are still missing. */
async function applyCreatorArtifacts(
  partner: Partner,
  creatorId: string,
  parts: { needsUser: boolean; needsProfile: boolean; needsAgreement: boolean },
  referralCode: string,
  status: CreatorProfile["status"],
  commissionValue: number,
): Promise<void> {
  const now = new Date().toISOString();
  if (parts.needsUser) {
    await UserModel.create({
      _id: creatorId,
      email: partner.contactEmail.trim().toLowerCase(),
      role: "creator",
      name: partner.name.trim(),
      plan: "free",
      planType: "free",
      emailVerified: false,
      status: "active",
      createdAt: now,
    });
  }
  if (parts.needsProfile) {
    const profile: CreatorProfile = {
      creatorId,
      referralCode,
      status,
      socialLinks: {},
      createdByAdminId: MIGRATION_ACTOR,
      createdAt: now,
    };
    await CreatorProfileModel.create({ _id: creatorId, ...profile });
  }
  if (parts.needsAgreement) {
    const commission: CommissionInput = { type: "percentage", value: commissionValue };
    await setCommissionAgreement(creatorId, commission, MIGRATION_ACTOR);
  }
}

async function migrateOnePartner(partner: Partner, summary: Summary): Promise<void> {
  const target = await resolveCreatorTarget(partner);
  if (!target) {
    summary.conflicts++;
    console.log(`  ⚠ ${partner.code}: ${partner.contactEmail} already belongs to a non-creator account — skipped (no data touched)`);
    return;
  }
  const { creatorId, isNew } = target;

  // Guard each artifact independently so a partial prior run resumes cleanly.
  const existingProfile = isNew ? undefined : await getCreatorById(creatorId);
  const existingAgreement = isNew ? undefined : await getActiveAgreement(creatorId);
  const parts = {
    needsUser: isNew,
    needsProfile: !existingProfile,
    needsAgreement: !existingAgreement,
  };
  const needsPointer = !partner.migratedToCreatorId;

  if (!parts.needsUser && !parts.needsProfile && !parts.needsAgreement && !needsPointer) {
    summary.skipped++;
    await backfillAttribution(partner.id, creatorId, summary);
    return;
  }

  const referralCode =
    existingProfile?.referralCode ?? (await generateReferralCode(partner.code));
  const status: CreatorProfile["status"] = partner.active ? "active" : "suspended";
  const commissionValue = Math.min(partner.commissionPct ?? 0, MAX_COMMISSION_PERCENT);

  console.log(
    `  • ${partner.code} → ${creatorId} [${DRY_RUN ? "DRY" : "WRITE"}] ` +
      `user:${parts.needsUser} profile:${parts.needsProfile}(${referralCode},${status}) ` +
      `agreement:${parts.needsAgreement}(${commissionValue}%) pointer:${needsPointer}`,
  );

  if (!DRY_RUN) {
    await applyCreatorArtifacts(partner, creatorId, parts, referralCode, status, commissionValue);
    if (needsPointer) {
      await PartnerModel.updateOne(
        { _id: partner.id },
        { $set: { migratedToCreatorId: creatorId } },
      );
    }
  }

  summary.migrated++;
  await backfillAttribution(partner.id, creatorId, summary);
}

async function main(): Promise<void> {
  await connectMongo();
  console.log(`\n=== Partner → Creator migration ===`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "APPLY (writing)"}`);

  const partners = await listPartners();
  console.log(`Found ${partners.length} partner(s).\n`);

  const summary: Summary = {
    scanned: 0,
    migrated: 0,
    usersBackfilled: 0,
    skipped: 0,
    conflicts: 0,
  };

  for (const partner of partners) {
    summary.scanned++;
    try {
      await migrateOnePartner(partner, summary);
    } catch (err) {
      console.error(`  ✗ ${partner.code}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`Scanned:           ${summary.scanned}`);
  console.log(`Migrated:          ${summary.migrated}`);
  console.log(`Users backfilled:  ${summary.usersBackfilled}`);
  console.log(`Skipped (done):    ${summary.skipped}`);
  console.log(`Conflicts:         ${summary.conflicts}`);
  console.log(DRY_RUN ? `\n(dry run — re-run without --dry-run to apply)\n` : `\nDone.\n`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
