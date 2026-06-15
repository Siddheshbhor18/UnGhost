/**
 * Point every company at a REAL, working logo.
 *
 * Background: the directory batches shipped with `logoUrl` pointing at
 * https://logo.clearbit.com/<domain>. HubSpot shut that free API down
 * (Dec 2024), so every one of those hotlinks now fails and the UI falls back
 * to a letter-initial.
 *
 * Source choice: Google's favicon service and DuckDuckGo's icon service both
 * serve a *generic placeholder* (a globe / blank monogram) for a large number
 * of real companies they haven't indexed (TCS, McKinsey, Duolingo, HCL, BP …),
 * so neither is acceptable. icon.horse fetches the company's *own* favicon /
 * apple-touch-icon and returns the real mark — verified to return high-res
 * logos (e.g. 180×180 for Duolingo/Infosys) for every domain that failed the
 * other two. We hotlink it:
 *
 *     https://icon.horse/icon/<domain>
 *
 * The UI (components/shared/CompanyLogo.tsx) hotlinks logoUrl as a plain <img>
 * and falls back to the brand letter-initial on error, so a domain icon.horse
 * can't resolve degrades gracefully.
 *
 * Why not host on R2? R2_PUBLIC_BASE_URL here points at the S3 API endpoint
 * (*.r2.cloudflarestorage.com), which is not publicly readable — uploaded
 * objects 400 for an <img>, and the prod public-bucket domain isn't available
 * in this environment. Until that's wired up, hotlinking is the only thing
 * that actually renders. (See the note at the end of the run for hardening.)
 *
 * IDEMPOTENT: only rewrites companies not already on an icon.horse URL.
 * Companies with internal/fictional domains, or domains icon.horse can't
 * resolve, are left on the letter-initial fallback. Never deletes anything.
 *
 * Local (default):   npx tsx scripts/fetch-company-logos.ts
 * Production:        SEED_ALLOW_PROD=true npx tsx scripts/fetch-company-logos.ts
 *   Optional:        LOGO_NOVERIFY=true  (set the URL without probing — faster,
 *                                         lets icon.horse's own fallback apply)
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import { CompanyModel } from "../server/db/models";
import { invalidate } from "../server/lib/cache";

const CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 12000;
const VERIFY = process.env.LOGO_NOVERIFY !== "true";

const STRIP_SUBDOMAINS = [
  "www.", "careers.", "career.", "jobs.", "job.", "apply.", "hire.",
  "hiring.", "talent.", "work.", "recruiting.", "recruitment.", "join.",
  "people.", "www2.",
];

function rootDomain(raw: string): string {
  let host = (raw ?? "").trim().toLowerCase();
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
    !domain.includes(".") ||           // e.g. "abb" — not a resolvable domain
    domain.endsWith(".test") ||
    domain.endsWith(".local") ||
    domain.endsWith(".example") ||
    domain.includes("unghost.in") ||
    domain.includes("unghost.com")
  );
}

function iconUrl(domain: string): string {
  return `https://icon.horse/icon/${domain}`;
}

/**
 * Probe icon.horse and accept only a real raster/vector image. icon.horse
 * returns a small generated monogram when it can't find a favicon; we let that
 * through too (it's a clean letter tile and still better than nothing), but we
 * reject non-images and transport errors so those domains keep our own
 * brand-gradient initial.
 */
async function resolves(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (unGhost logo backfill)" },
    });
    if (!res.ok) return false;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/")) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 200;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const uri = process.env.MONGODB_URI ?? "";
  const smellsLikeProd =
    process.env.NODE_ENV === "production" ||
    (/mongodb\+srv:\/\/.*@.*\.mongodb\.net/.test(uri) &&
      !/staging|dev|test|localhost/i.test(uri));
  if (smellsLikeProd && process.env.SEED_ALLOW_PROD !== "true") {
    console.error(
      "[logo-fetch] target looks like production. Re-run with SEED_ALLOW_PROD=true to proceed.",
    );
    process.exit(1);
  }

  await connectMongo();
  console.log("[logo-fetch] connected to", mongoose.connection.host);

  const all = (await CompanyModel.find(
    {},
    { _id: 1, name: 1, domain: 1, logoUrl: 1 },
  ).lean()) as Array<{ _id: string; name: string; domain?: string; logoUrl?: string }>;
  console.log(`[logo-fetch] ${all.length} companies${VERIFY ? " (verifying each)" : ""}`);

  const stats = { updated: 0, already: 0, internal: 0, unresolved: 0 };

  async function handle(c: (typeof all)[number]) {
    const domain = rootDomain(c.domain ?? "");
    if (isInternal(domain)) {
      stats.internal++;
      // Clear any stale dead hotlink so it falls straight to the initial.
      if (c.logoUrl && !/icon\.horse/.test(c.logoUrl)) {
        await CompanyModel.updateOne({ _id: c._id }, { $set: { logoUrl: "" } });
      }
      return;
    }
    const url = iconUrl(domain);
    if ((c.logoUrl ?? "") === url) {
      stats.already++;
      return;
    }
    if (VERIFY && !(await resolves(url))) {
      stats.unresolved++;
      // Leave the brand-gradient initial rather than a broken hotlink.
      if (c.logoUrl && !/icon\.horse/.test(c.logoUrl)) {
        await CompanyModel.updateOne({ _id: c._id }, { $set: { logoUrl: "" } });
      }
      return;
    }
    await CompanyModel.updateOne({ _id: c._id }, { $set: { logoUrl: url } });
    stats.updated++;
    if (stats.updated % 50 === 0) console.log(`[logo-fetch] ${stats.updated} updated…`);
  }

  const queue = [...all];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const c = queue.shift();
      if (c) await handle(c);
    }
  });
  await Promise.all(workers);

  await invalidate("companies:all", "companies:all:lite");

  console.log("[logo-fetch] done →", stats);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[logo-fetch] failed:", err);
  process.exit(1);
});
