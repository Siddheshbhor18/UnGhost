/**
 * Backfill canonical `skillIds` onto existing jobs + student profiles (Phase 2).
 *
 * Only sets skillIds where it's missing/empty and raw `skills` exist. NEVER
 * touches the raw `skills` arrays (they stay the immutable source of truth +
 * rollback path). Dry-run by default; pass --apply to write.
 *
 * Run AFTER seed-skill-taxonomy so most skills hit the taxonomy (few misses).
 *   npx tsx scripts/backfill-skill-ids.ts                 # dry run
 *   SEED_ALLOW_PROD=true npx tsx scripts/backfill-skill-ids.ts --apply
 *
 * Note: resolution may upsert PendingSkill rows for not-yet-curated skills
 * (idempotent) — that's the curation queue filling, not a data mutation.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import { JobModel, UserModel } from "../server/db/models";
import { resolveSkillIds } from "../server/lib/skill-resolve";

const APPLY = process.argv.includes("--apply");

async function main() {
  const uri = process.env.MONGODB_URI ?? "";
  const smellsLikeProd =
    process.env.NODE_ENV === "production" ||
    (/mongodb\+srv:\/\/.*@.*\.mongodb\.net/.test(uri) &&
      !/staging|dev|test|localhost/i.test(uri));
  if (APPLY && smellsLikeProd && process.env.SEED_ALLOW_PROD !== "true") {
    console.error("[backfill-skillids] production target — re-run with SEED_ALLOW_PROD=true to apply.");
    process.exit(1);
  }

  await connectMongo();

  const needsIds = {
    skills: { $exists: true, $ne: [] },
    $or: [{ skillIds: { $exists: false } }, { skillIds: { $size: 0 } }],
  };

  // ── Jobs ──
  const jobs = await JobModel.find(needsIds as never).select("_id skills").lean();
  let jobsWritten = 0;
  const jobSamples: string[] = [];
  for (const j of jobs) {
    const ids = await resolveSkillIds((j.skills ?? []) as string[]);
    jobSamples.length < 5 && jobSamples.push(`${j._id}: [${(j.skills ?? []).join(", ")}] → [${ids.join(", ")}]`);
    if (APPLY && ids.length) {
      await JobModel.updateOne({ _id: j._id }, { $set: { skillIds: ids } });
      jobsWritten++;
    }
  }

  // ── Student profiles ──
  const users = await UserModel.find({
    role: "student",
    "profile.skills": { $exists: true, $ne: [] },
    $or: [{ "profile.skillIds": { $exists: false } }, { "profile.skillIds": { $size: 0 } }],
  } as never)
    .select("_id profile.skills")
    .lean();
  let usersWritten = 0;
  const userSamples: string[] = [];
  for (const u of users) {
    const skills = ((u as { profile?: { skills?: string[] } }).profile?.skills ?? []) as string[];
    const ids = await resolveSkillIds(skills);
    userSamples.length < 5 && userSamples.push(`${u._id}: [${skills.join(", ")}] → [${ids.join(", ")}]`);
    if (APPLY && ids.length) {
      await UserModel.updateOne({ _id: u._id }, { $set: { "profile.skillIds": ids } });
      usersWritten++;
    }
  }

  console.log(`\n=== backfill-skill-ids (${APPLY ? "APPLIED" : "DRY RUN"}) ===`);
  console.log(`jobs needing skillIds:     ${jobs.length}${APPLY ? `   written: ${jobsWritten}` : ""}`);
  console.log(`profiles needing skillIds: ${users.length}${APPLY ? `   written: ${usersWritten}` : ""}`);
  console.log(`\njob samples:\n  ${jobSamples.join("\n  ") || "(none)"}`);
  console.log(`\nprofile samples:\n  ${userSamples.join("\n  ") || "(none)"}`);
  if (!APPLY) console.log(`\n(dry run — re-run with --apply to write skillIds; raw skills untouched either way)`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
