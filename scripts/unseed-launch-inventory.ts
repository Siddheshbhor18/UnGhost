/**
 * Rollback the launch-inventory batch.
 *
 * Deletes ONLY the documents created by scripts/seed-launch-inventory.ts,
 * matched by their batch-prefixed ids (co_liv1_ / rec_liv1_ / job_liv1_).
 * Surgical — leaves all other data untouched.
 *
 * Local (default):   npx tsx scripts/unseed-launch-inventory.ts
 * Production:        SEED_ALLOW_PROD=true npx tsx scripts/unseed-launch-inventory.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import { CompanyModel, JobModel, UserModel } from "../server/db/models";
import { invalidate } from "../server/lib/cache";

async function main() {
  const uri = process.env.MONGODB_URI ?? "";
  const smellsLikeProd =
    process.env.NODE_ENV === "production" ||
    (/mongodb\+srv:\/\/.*@.*\.mongodb\.net/.test(uri) &&
      !/staging|dev|test|localhost/i.test(uri));
  if (smellsLikeProd && process.env.SEED_ALLOW_PROD !== "true") {
    console.error(
      "[launch-unseed] target looks like production. Re-run with SEED_ALLOW_PROD=true to proceed.",
    );
    process.exit(1);
  }

  await connectMongo();
  console.log("[launch-unseed] connected to", mongoose.connection.host);

  const jobsDel = await JobModel.deleteMany({ _id: { $regex: "^job_liv1_" } });
  const recDel = await UserModel.deleteMany({ _id: { $regex: "^rec_liv1_" } });
  const coDel = await CompanyModel.deleteMany({ _id: { $regex: "^co_liv1_" } });

  await invalidate("jobs:active", "jobs:active:lite");

  console.log("[launch-unseed] removed →", {
    jobs: jobsDel.deletedCount,
    recruiters: recDel.deletedCount,
    companies: coDel.deletedCount,
  });

  await mongoose.disconnect();
  console.log("[launch-unseed] done.");
}

main().catch((err) => {
  console.error("[launch-unseed] failed:", err);
  process.exit(1);
});
