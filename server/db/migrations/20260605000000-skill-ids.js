/**
 * Phase 2 skill taxonomy: add indexes for the new `skillIds` arrays on jobs +
 * student profiles. Additive only — adds NO field values (the backfill script
 * does that separately). Idempotent; `down` drops only these named indexes.
 *
 * Note: ix_users_profile_skillIds is forward-looking — searchCandidates filters
 * in memory today, so it only pays off if/when search becomes a server-side
 * { "profile.skillIds": { $in } } query. Cheap + additive, so we add it now.
 */
const INDEXES = [
  ["jobs", { skillIds: 1 }, { name: "ix_jobs_skillIds" }],
  ["users", { "profile.skillIds": 1 }, { name: "ix_users_profile_skillIds" }],
];

function sameKeys(a, b) {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k, i) => k === bk[i] && a[k] === b[k]);
}

module.exports = {
  async up(db) {
    for (const [coll, keys, opts] of INDEXES) {
      const existing = await db.collection(coll).indexes().catch(() => []);
      const duplicate = existing.find((ix) => sameKeys(ix.key, keys));
      if (duplicate) {
        // eslint-disable-next-line no-console
        console.log(`  = ${opts.name} skipped — ${duplicate.name} already covers it on ${coll}`);
        continue;
      }
      await db.collection(coll).createIndex(keys, opts);
      // eslint-disable-next-line no-console
      console.log(`  + ${opts.name} on ${coll}`);
    }
  },

  async down(db) {
    for (const [coll, , opts] of INDEXES) {
      try {
        await db.collection(coll).dropIndex(opts.name);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`  ! could not drop ${opts.name}: ${e.message}`);
      }
    }
  },
};
