/**
 * READ-ONLY: mine the distinct skill vocabulary from prod.
 *
 * Aggregates every skill string across jobs, student profiles, verified
 * skills, and bootcamps; clusters by normalizeSkill() to reveal variant
 * spread (the would-be false gaps), and writes a candidate taxonomy artifact.
 *
 * Writes NOTHING to the database. Output → /tmp/skill-vocabulary.json.
 *   npx tsx scripts/mine-skill-vocabulary.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import fs from "fs";
import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import { JobModel, UserModel, BootcampModel } from "../server/db/models";
import { normalizeSkill } from "../shared/skills";

async function main() {
  await connectMongo();

  const rawCount = new Map<string, number>();
  const add = (raw: unknown) => {
    if (typeof raw !== "string") return;
    const s = raw.trim();
    if (!s) return;
    rawCount.set(s, (rawCount.get(s) ?? 0) + 1);
  };

  const jobs = await JobModel.find({}).select("skills").lean();
  for (const j of jobs) for (const s of (j.skills ?? [])) add(s);

  const bcs = await BootcampModel.find({}).select("skill").lean();
  for (const b of bcs) add((b as { skill?: string }).skill);

  const users = await UserModel.find({ role: "student" })
    .select("profile.skills profile.verifiedSkills")
    .lean();
  for (const u of users) {
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
  const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);
  const ranked = [...clusters.entries()].sort((a, b) => total(b[1]) - total(a[1]));
  const multi = ranked.filter(([, m]) => m.size > 1);

  console.log("\n=== PROD SKILL VOCABULARY ===");
  console.log(`jobs scanned:            ${jobs.length}`);
  console.log(`students scanned:        ${users.length}`);
  console.log(`bootcamps scanned:       ${bcs.length}`);
  console.log(`distinct raw skills:     ${rawCount.size}`);
  console.log(`distinct normalized keys:${clusters.size}`);
  console.log(`keys w/ >1 raw variant:  ${multi.size ?? multi.length}  (the false-gap candidates)`);

  console.log("\n--- top 40 keys by frequency ---");
  for (const [key, m] of ranked.slice(0, 40)) {
    const variants = m.size > 1 ? "  ⟵ " + [...m.keys()].join(" | ") : "";
    console.log(`${String(total(m)).padStart(4)}  ${key}${variants}`);
  }

  console.log("\n--- ALL multi-variant clusters (would mismatch before canon) ---");
  if (multi.length === 0) console.log("  (none — every skill already normalizes uniquely)");
  for (const [key, m] of multi) console.log(`  ${key}:  ${[...m.keys()].join("  |  ")}`);

  const artifact = ranked.map(([key, m]) => ({
    canonicalKey: key,
    total: total(m),
    variants: [...m.entries()].map(([raw, n]) => ({ raw, count: n })),
  }));
  fs.writeFileSync("/tmp/skill-vocabulary.json", JSON.stringify(artifact, null, 2));
  console.log(`\nartifact: /tmp/skill-vocabulary.json  (${artifact.length} keys)`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
