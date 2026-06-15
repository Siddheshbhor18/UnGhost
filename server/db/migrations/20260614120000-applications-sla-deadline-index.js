/**
 * SLA-sweep index. The breach sweep queries active applications by `stage` and
 * (once the sweep is rewritten to be deadline-bounded) ranges on `slaDeadline`.
 * The baseline indexes all LEAD with studentId/jobId/recruiterId, so none can
 * serve a stage-led + deadline-ranged query — the sweep falls back to the
 * single-field `stage` index and pulls every active application into memory.
 *
 * { stage: 1, slaDeadline: 1 } lets the sweep fetch only soon-to-breach rows
 * (equality on stage via $in, range on slaDeadline). Additive + idempotent;
 * `down` drops only this named index.
 */
const INDEXES = [
  ["applications", { stage: 1, slaDeadline: 1 }, { name: "ix_applications_stage_slaDeadline" }],
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
