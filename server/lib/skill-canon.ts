// Skill canonicalization resolver (read-time, cached, self-growing).
//
// Maps a batch of free-text skill strings to a canonical comparison key so
// matching stops showing false "gaps" when the same skill is written
// differently on the resume vs the job ("React.js" vs "React").
//
// Design (Phase 0):
//   1. normalizeSkill() is the deterministic floor + cache key.
//   2. Redis cache (skillcanon:v1:<key> -> canonical) is consulted first;
//      it self-grows from real traffic, so there is no hand-maintained list.
//   3. Cache misses are resolved in ONE batched LLM call (the AIAdapter
//      chain groq→gemini→claude→mock). The mock returns identity, so with
//      no API key (or on any failure) behaviour == today's exact matching.
//   4. CONFUSABLE_GUARD is enforced AFTER the model — a proposed merge of a
//      forbidden pair (Java/JavaScript, AWS/AW…) is discarded.
//
// NEVER blocks and NEVER writes user/job documents. On LLM failure it falls
// back to the normalized identity and does not poison the cache.

import type { AIAdapter } from "@/shared/types/ai";
import { redis } from "@/server/db/redis";
import { logger } from "@/server/lib/logger";
import { normalizeSkill, isConfusablePair } from "@/shared/skills";

const TTL_SEC = 60 * 60 * 24 * 30; // 30 days — canonical names are near-static.
const cacheKey = (k: string) => `skillcanon:v1:${k}`;

/**
 * Resolve raw skill strings → canonical comparison keys.
 * Returns a Map keyed by the ORIGINAL raw string (so callers map their arrays
 * back). `adapter` is injectable for tests; defaults to the live chain.
 */
export async function canonicalizeSkills(
  skills: string[],
  adapter?: AIAdapter,
  opts?: { cacheOnly?: boolean },
): Promise<Map<string, string>> {
  const out = new Map<string, string>();

  // Distinct normalized keys (the floor doubles as the cache key).
  const keys = new Set<string>();
  for (const s of skills) {
    const k = normalizeSkill(s);
    if (k) keys.add(k);
  }
  if (keys.size === 0) {
    for (const s of skills) out.set(s, normalizeSkill(s));
    return out;
  }

  const r = redis();
  const keyList = [...keys];

  // 1. Read cache.
  const resolved = new Map<string, string>();
  await Promise.all(
    keyList.map(async (k) => {
      try {
        const v = await r.get(cacheKey(k));
        if (v) resolved.set(k, v);
      } catch {
        /* cache read is best-effort */
      }
    }),
  );

  // 2. Resolve misses in one batched adapter call.
  // `cacheOnly` callers (e.g. the dashboard render path) skip the LLM entirely
  // so the request never blocks on model latency — misses fall through to the
  // identity match below, exactly like the no-API-key / failure fallback. A
  // background warm (see canonicalizeSkillsWarm) fills the cache for next time.
  const misses = keyList.filter((k) => !resolved.has(k));
  if (misses.length > 0 && !opts?.cacheOnly) {
    const a = adapter ?? (await import("@/server/integrations/ai")).getAI();
    const knownCanon = [...new Set(resolved.values())];
    try {
      const items = await a.canonicalizeSkills(misses, knownCanon);
      const byKey = new Map(items.map((it) => [normalizeSkill(it.raw), it.canonical]));
      for (const k of misses) {
        const proposed = byKey.get(k);
        let canon = k; // default: identity
        if (proposed && proposed.trim().toUpperCase() !== "UNMATCHED") {
          const c = normalizeSkill(proposed);
          // Guardrail: never accept a forbidden merge, whatever the model says.
          if (c && !isConfusablePair(k, c)) canon = c;
        }
        resolved.set(k, canon);
        // Cache the resolution (identity included — it's a valid stable answer).
        try {
          await r.set(cacheKey(k), canon, { ex: TTL_SEC });
        } catch {
          /* cache write is best-effort */
        }
      }
    } catch (err) {
      // LLM chain failed entirely — fall back to identity, do NOT cache (retry later).
      logger.warn({ err, count: misses.length }, "skill-canon.resolve-failed");
      for (const k of misses) resolved.set(k, k);
    }
  }

  // 3. Build raw → canonical map.
  for (const s of skills) {
    const k = normalizeSkill(s);
    out.set(s, resolved.get(k) ?? k);
  }
  return out;
}

/**
 * Fire-and-forget cache warm. Resolves any uncached skills via the LLM and
 * writes them to Redis WITHOUT blocking the caller. Pair it with a
 * `cacheOnly: true` read on the critical path: this render uses cached/identity
 * values instantly, and the next render finds the freshly-warmed canon. Never
 * throws.
 */
export function canonicalizeSkillsWarm(skills: string[]): void {
  void canonicalizeSkills(skills).catch(() => {
    /* best-effort — the cacheOnly read already returned a usable map */
  });
}
