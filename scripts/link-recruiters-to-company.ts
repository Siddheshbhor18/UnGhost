/**
 * Backup-then-link unlinked recruiters of a given email domain to a company,
 * creating the company if it doesn't exist. Surgical: backs up every affected
 * user + the company row first, only sets user.companyId / user.isCompanyAdmin
 * and company.recruiterIds. Never deletes.
 *
 * USAGE
 *   DOMAIN=bigvision.marketing COMPANY_NAME="BigVision Marketing" \
 *     npx tsx scripts/link-recruiters-to-company.ts
 *
 * Add LINK_CONFIRM=yes to apply; without it the script only inspects + backs up.
 * The first linked recruiter (oldest account) becomes the company admin.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import { UserModel, CompanyModel } from "../server/db/models";

async function main() {
  const domain = process.env.DOMAIN?.trim().toLowerCase();
  const companyName = process.env.COMPANY_NAME?.trim();
  const confirm = process.env.LINK_CONFIRM === "yes";
  if (!domain || !companyName) {
    console.error("[link] Missing DOMAIN or COMPANY_NAME.");
    process.exit(1);
  }
  await connectMongo();

  // All recruiters on this domain (case-insensitive) that aren't linked yet.
  const recruiters = (await UserModel.find({
    role: "recruiter",
    email: { $regex: `@${domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
  })
    .sort({ createdAt: 1 })
    .lean()) as any[];

  const unlinked = recruiters.filter((r) => !r.companyId);
  console.log(`[link] ${recruiters.length} recruiter(s) on @${domain}; ${unlinked.length} unlinked:`);
  for (const r of recruiters) {
    console.log(`  - ${r._id}  ${r.email}  companyId=${r.companyId ?? "null"}  admin=${r.isCompanyAdmin ?? false}`);
  }
  if (unlinked.length === 0) {
    console.log("[link] Nothing to link.");
    await mongoose.disconnect();
    return;
  }

  // Find existing company by domain, else plan to create one.
  let company = (await CompanyModel.findOne({ domain }).lean()) as any;
  const companyId: string = company?._id ?? `co_${randomBytes(6).toString("hex")}`;
  console.log(
    company
      ? `[link] Existing company ${companyId} ("${company.name}")`
      : `[link] Will CREATE company ${companyId} ("${companyName}", domain ${domain})`,
  );

  // Backup.
  const dir = join("scripts", "backups", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `link-recruiters-${domain}.json`), JSON.stringify({ recruiters, company }, null, 2));
  console.log(`[link] Backed up ${recruiters.length} user(s) + company to ${dir}`);

  const adminId = unlinked[0]._id; // oldest unlinked → company admin
  console.log(`[link] Plan: link ${unlinked.map((u) => u.email).join(", ")} → ${companyId}; admin = ${unlinked[0].email}`);

  if (!confirm) {
    console.log("[link] DRY RUN — set LINK_CONFIRM=yes to apply.");
    await mongoose.disconnect();
    return;
  }

  // Create company if needed.
  if (!company) {
    await CompanyModel.create({
      _id: companyId,
      name: companyName,
      logoUrl: "",
      domain,
      description: "",
      recruiterIds: [],
      verified: false,
      status: "active",
    });
    console.log(`[link] Created company ${companyId}.`);
  }

  // Link each recruiter + record on company.recruiterIds.
  for (const u of unlinked) {
    await UserModel.updateOne(
      { _id: u._id },
      { $set: { companyId, isCompanyAdmin: u._id === adminId } },
    );
  }
  await CompanyModel.updateOne(
    { _id: companyId },
    { $addToSet: { recruiterIds: { $each: unlinked.map((u) => u._id) } } },
  );
  console.log(`[link] Linked ${unlinked.length} recruiter(s) to ${companyId}.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[link] failed:", err);
  process.exit(1);
});
