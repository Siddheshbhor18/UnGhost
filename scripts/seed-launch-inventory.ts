/**
 * Additive launch-inventory seeder.
 *
 * Upserts the 62 companies / 62 recruiters / 100 jobs from
 * server/db/seeds/launch-inventory.ts into MongoDB. Strictly ADDITIVE and
 * IDEMPOTENT — it upserts by _id and NEVER deletes. Unlike scripts/seed.ts,
 * it does not wipe any collection, so it is safe to run against a live DB.
 *
 * Local (default):   npx tsx scripts/seed-launch-inventory.ts
 * Production:        SEED_ALLOW_PROD=true npx tsx scripts/seed-launch-inventory.ts
 *
 * Recruiter passwords: the seed data ships a SHARED plaintext string in
 * `passwordHash` — historically that string was written straight in, giving
 * every seeded recruiter the same credential. That's a mass-compromise if
 * the seed ever ran against prod. We now IGNORE the shared string on write
 * and generate a per-recruiter cryptographically random password instead;
 * the accounts are effectively invite-only after seeding — ops issues
 * password-reset links from the admin panel to activate each recruiter.
 *
 * The random passwords are NEVER logged. Onboarding path: admin panel →
 * user detail → "Send password-reset" (uses the same reset-token machinery
 * as /forgot-password).
 *
 * To roll the batch back: npx tsx scripts/unseed-launch-inventory.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import { CompanyModel, JobModel, UserModel } from "../server/db/models";
import { hashPassword } from "../server/auth/password";
import { invalidate } from "../server/lib/cache";
import { companies, recruiters, jobs } from "../server/db/seeds/launch-inventory";

async function main() {
  // Prod guard: this is additive, but writing into production should still be
  // a deliberate act. Default to local; require SEED_ALLOW_PROD=true for prod.
  const uri = process.env.MONGODB_URI ?? "";
  const smellsLikeProd =
    process.env.NODE_ENV === "production" ||
    (/mongodb\+srv:\/\/.*@.*\.mongodb\.net/.test(uri) &&
      !/staging|dev|test|localhost/i.test(uri));
  if (smellsLikeProd && process.env.SEED_ALLOW_PROD !== "true") {
    console.error(
      "[launch-seed] target looks like production. Re-run with SEED_ALLOW_PROD=true to proceed.",
    );
    process.exit(1);
  }

  await connectMongo();
  console.log("[launch-seed] connected to", mongoose.connection.host);

  // 1) Companies — upsert by _id.
  for (const c of companies) {
    const { id, ...rest } = c;
    await CompanyModel.updateOne(
      { _id: id },
      { $set: { _id: id, ...rest } },
      { upsert: true },
    );
  }
  console.log("[launch-seed] upserted companies:", companies.length);

  // 2) Recruiters — the seed's shared plaintext is DELIBERATELY IGNORED.
  //    We mint a fresh 32-byte random password per recruiter and bcrypt-hash
  //    that. On existing rows we only touch the non-credential fields via
  //    `$set` (below) so re-running the seeder doesn't rotate live
  //    passwords out from under active users. Fresh inserts get the random
  //    password + no way to log in until an admin sends a reset link.
  //    createdAt is only set on insert (never overwritten on re-runs).
  for (const r of recruiters) {
    const { id, passwordHash: _sharedPlaintext, ...rest } = r;
    // Random per-account credential — never logged, never in-repo.
    const disposable = randomBytes(32).toString("hex");
    const hashed = await hashPassword(disposable);
    await UserModel.updateOne(
      { _id: id },
      {
        // Field-level whitelist keeps the credential OUT of the update path
        // for rows that already exist. Only the display / linkage fields
        // refresh on re-runs; the random passwordHash lands only on insert.
        $set: { _id: id, ...rest },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
          passwordHash: hashed,
        },
      },
      { upsert: true },
    );
  }
  console.log(
    "[launch-seed] upserted recruiters:",
    recruiters.length,
    "(new accounts are locked until an admin sends a password-reset link)",
  );

  // 3) Jobs — upsert by _id (createdAt comes from the dataset itself).
  for (const j of jobs) {
    const { id, ...rest } = j;
    await JobModel.updateOne(
      { _id: id },
      { $set: { _id: id, ...rest } },
      { upsert: true },
    );
  }
  console.log("[launch-seed] upserted jobs:", jobs.length);

  // Refresh the public job-feed cache so the new rows show immediately.
  await invalidate("jobs:active", "jobs:active:lite");

  // Report batch totals currently in the DB (filtered to this batch's prefix).
  const [co, rec, jb] = await Promise.all([
    CompanyModel.countDocuments({ _id: { $regex: "^co_liv1_" } }),
    UserModel.countDocuments({ _id: { $regex: "^rec_liv1_" } }),
    JobModel.countDocuments({ _id: { $regex: "^job_liv1_" } }),
  ]);
  console.log("[launch-seed] batch now in DB →", { companies: co, recruiters: rec, jobs: jb });

  await mongoose.disconnect();
  console.log("[launch-seed] done.");
}

main().catch((err) => {
  console.error("[launch-seed] failed:", err);
  process.exit(1);
});
