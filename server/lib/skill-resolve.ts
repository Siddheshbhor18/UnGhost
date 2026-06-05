// Write-path skill resolution (Phase 2).
//
// Wraps the pure-read Phase-0 canonicalizer (server/lib/skill-canon.ts) to turn
// raw skill strings into canonical taxonomy IDs for STORAGE (dual-write), and
// records unmatched skills into the curation queue. Keeping this separate
// preserves skill-canon.ts's "never writes documents / never blocks" invariant.
//
// skillId == the normalized canonical key (e.g. "react"). Aliases fold variants
// in at read time, so a taxonomy merge never has to rewrite stored skillIds.

import { canonicalizeSkills } from "@/server/lib/skill-canon";
import { SkillModel, PendingSkillModel } from "@/server/db/models";
import { cached } from "@/server/lib/cache";
import { normalizeSkill } from "@/shared/skills";
import { logger } from "@/server/lib/logger";
import type { AIAdapter } from "@/shared/types/ai";

interface Taxonomy {
  keys: Set<string>;
  aliasToKey: Map<string, string>;
}

/** Taxonomy keys + alias→canonical map. Cached 5min; rebuilt from the cached rows. */
export async function loadTaxonomy(): Promise<Taxonomy> {
  const rows = await cached("skills:taxonomy", 300, async () => {
    const docs = await SkillModel.find({}).select("_id aliases").lean();
    return docs.map((d) => ({
      key: String(d._id),
      aliases: ((d as { aliases?: string[] }).aliases ?? []).map(String),
    }));
  });
  const keys = new Set<string>();
  const aliasToKey = new Map<string, string>();
  for (const r of rows) {
    keys.add(r.key);
    for (const a of r.aliases) {
      const ak = normalizeSkill(a);
      if (ak) aliasToKey.set(ak, r.key);
    }
  }
  return { keys, aliasToKey };
}

/**
 * Resolve raw skill strings → canonical taxonomy IDs for storage.
 * Unmatched skills get a provisional id (their own normalized key) so matching
 * keeps working, AND are queued for admin curation (fire-and-forget).
 */
export async function resolveSkillIds(
  rawSkills: string[],
  adapter?: AIAdapter,
): Promise<string[]> {
  if (!rawSkills?.length) return [];

  const canonMap = await canonicalizeSkills(rawSkills, adapter);
  let tax: Taxonomy;
  try {
    tax = await loadTaxonomy();
  } catch (err) {
    // Fail soft — without the taxonomy we still emit normalized keys.
    logger.warn({ err }, "skill-resolve.taxonomy-load-failed");
    tax = { keys: new Set(), aliasToKey: new Map() };
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  const misses: Array<{ key: string; raw: string }> = [];

  for (const raw of rawSkills) {
    let key = canonMap.get(raw) ?? normalizeSkill(raw);
    if (!key) continue;
    key = tax.aliasToKey.get(key) ?? key; // fold aliases → canonical
    if (seen.has(key)) continue;
    seen.add(key);
    ids.push(key);
    if (!tax.keys.has(key)) misses.push({ key, raw });
  }

  if (misses.length) {
    void Promise.allSettled(
      misses.map((m) => recordPendingSkill(m.key, m.raw)),
    );
  }
  return ids;
}

/** Upsert a not-in-taxonomy skill into the curation queue. Never throws. */
export async function recordPendingSkill(key: string, rawSample: string): Promise<void> {
  try {
    await PendingSkillModel.updateOne(
      { _id: key },
      {
        $inc: { occurrences: 1 },
        $addToSet: { rawSamples: rawSample },
        $setOnInsert: {
          decision: "pending",
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
  } catch (err) {
    logger.warn({ err, key }, "skill-resolve.pending-record-failed");
  }
}
