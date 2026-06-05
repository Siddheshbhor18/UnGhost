/**
 * Seed the canonical skill taxonomy (Phase 2) from real prod data.
 *
 * Self-contained: aggregates every skill string across jobs / profiles /
 * verifiedSkills / bootcamps, clusters by normalizeSkill(), and upserts one
 * SkillModel per canonical key (canonicalName = the most common raw spelling).
 * Idempotent. Dry-run by default; pass --apply to write.
 *
 *   npx tsx scripts/seed-skill-taxonomy.ts                 # dry run
 *   SEED_ALLOW_PROD=true npx tsx scripts/seed-skill-taxonomy.ts --apply
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import { JobModel, UserModel, BootcampModel, SkillModel } from "../server/db/models";
import { invalidate } from "../server/lib/cache";
import { normalizeSkill } from "../shared/skills";

const APPLY = process.argv.includes("--apply");

async function main() {
  const uri = process.env.MONGODB_URI ?? "";
  const smellsLikeProd =
    process.env.NODE_ENV === "production" ||
    (/mongodb\+srv:\/\/.*@.*\.mongodb\.net/.test(uri) &&
      !/staging|dev|test|localhost/i.test(uri));
  if (APPLY && smellsLikeProd && process.env.SEED_ALLOW_PROD !== "true") {
    console.error(
      "[seed-taxonomy] target looks like production. Re-run with SEED_ALLOW_PROD=true to apply.",
    );
    process.exit(1);
  }

  await connectMongo();

  const rawCount = new Map<string, number>();
  const add = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const s = raw.trim();
    if (s) rawCount.set(s, (rawCount.get(s) ?? 0) + 1);
  };
  for (const j of await JobModel.find({}).select("skills").lean())
    for (const s of (j.skills ?? [])) add(s);
  for (const b of await BootcampModel.find({}).select("skill").lean())
    add((b as { skill?: string }).skill);
  for (const u of await UserModel.find({ role: "student" }).select("profile.skills profile.verifiedSkills").lean()) {
    const p = (u as { profile?: { skills?: string[]; verifiedSkills?: string[] } }).profile;
    for (const s of (p?.skills ?? [])) add(s);
    for (const s of (p?.verifiedSkills ?? [])) add(s);
  }

  // Cluster raw variants by normalized key.
  const clusters = new Map<string, Map<string, number>>();
  for (const [raw, n] of rawCount) {
    const key = normalizeSkill(raw);
    if (!key) continue;
    if (!clusters.has(key)) clusters.set(key, new Map());
    clusters.get(key)!.set(raw, n);
  }

  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  const samples: string[] = [];

  for (const [key, variants] of clusters) {
    const ranked = [...variants.entries()].sort((a, b) => b[1] - a[1]);
    const canonicalName = ranked[0][0]; // most common raw spelling
    // aliases = normalized forms of other variants that differ from the key
    const aliases = [
      ...new Set(ranked.slice(1).map(([r]) => normalizeSkill(r)).filter((a) => a && a !== key)),
    ];
    samples.length < 15 && samples.push(`${key} → "${canonicalName}"${aliases.length ? ` [${aliases.join(",")}]` : ""}`);

    if (!APPLY) {
      const existing = await SkillModel.exists({ _id: key });
      existing ? updated++ : created++;
      continue;
    }
    const res = await SkillModel.updateOne(
      { _id: key },
      {
        $set: { canonicalName, aliases, source: "mined" },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    if (res.upsertedCount) created++;
    else updated++;
  }

  if (APPLY) await invalidate("skills:taxonomy", "skills:all");

  console.log(`\n=== seed-skill-taxonomy (${APPLY ? "APPLIED" : "DRY RUN"}) ===`);
  console.log(`distinct canonical keys: ${clusters.size}`);
  console.log(`${APPLY ? "created" : "would create"}: ${created}   ${APPLY ? "updated" : "already exist"}: ${updated}`);
  console.log(`sample:\n  ${samples.join("\n  ")}`);
  if (!APPLY) console.log(`\n(dry run — re-run with --apply to write)`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
