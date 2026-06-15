/**
 * Backfill domain-based logos for companies that don't have one yet.
 *
 * For every company with an empty `logoUrl` and a real public domain, sets
 * logoUrl to https://logo.clearbit.com/<root-domain>. The UI falls back to a
 * letter-initial when the service has no logo (CompanyLogo.tsx), so a wrong
 * guess degrades gracefully rather than showing a broken image.
 *
 * Skips:
 *   - companies that already have a logoUrl (e.g. the demo seed SVGs)
 *   - fictional / internal domains (.test, .local, *.unghost.in)
 *
 * IDEMPOTENT and ADDITIVE — only fills empty logoUrl, never overwrites.
 *
 * Local (default):   npx tsx scripts/backfill-company-logos.ts
 * Production:        SEED_ALLOW_PROD=true npx tsx scripts/backfill-company-logos.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import { CompanyModel } from "../server/db/models";
import { invalidate } from "../server/lib/cache";

const STRIP_SUBDOMAINS = [
  "www.", "careers.", "career.", "jobs.", "job.", "apply.", "hire.",
  "hiring.", "talent.", "work.", "recruiting.", "recruitment.", "join.",
  "people.", "www2.",
];

function rootDomain(raw: string): string {
  let host = raw.trim().toLowerCase();
  // Tolerate a full URL or a bare domain.
  host = host.replace(/^https?:\/\//, "").split("/")[0];
  let changed = true;
  while (changed) {
    changed = false;
    for (const pre of STRIP_SUBDOMAINS) {
      if (host.startsWith(pre)) {
        host = host.slice(pre.length);
        changed = true;
      }
    }
  }
  return host;
}

function isInternal(domain: string): boolean {
  return (
    !domain ||
    domain.endsWith(".test") ||
    domain.endsWith(".local") ||
    domain.endsWith(".unghost.in") ||
    domain.includes("unghost.in")
  );
}

async function main() {
  const uri = process.env.MONGODB_URI ?? "";
  const smellsLikeProd =
    process.env.NODE_ENV === "production" ||
    (/mongodb\+srv:\/\/.*@.*\.mongodb\.net/.test(uri) &&
      !/staging|dev|test|localhost/i.test(uri));
  if (smellsLikeProd && process.env.SEED_ALLOW_PROD !== "true") {
    console.error(
      "[logo-backfill] target looks like production. Re-run with SEED_ALLOW_PROD=true to proceed.",
    );
    process.exit(1);
  }

  await connectMongo();
  console.log("[logo-backfill] connected to", mongoose.connection.host);

  const docs = await CompanyModel.find({
    $or: [{ logoUrl: "" }, { logoUrl: { $exists: false } }, { logoUrl: null }],
  }).lean();

  let updated = 0;
  let skipped = 0;
  for (const c of docs as Array<{ _id: string; domain?: string }>) {
    const domain = rootDomain(c.domain ?? "");
    if (isInternal(domain)) {
      skipped++;
      continue;
    }
    await CompanyModel.updateOne(
      { _id: c._id },
      { $set: { logoUrl: `https://logo.clearbit.com/${domain}` } },
    );
    updated++;
  }

  await invalidate("companies:all", "companies:all:lite");

  console.log("[logo-backfill] done →", {
    candidates: docs.length,
    updated,
    skipped,
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[logo-backfill] failed:", err);
  process.exit(1);
});
