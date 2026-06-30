/**
 * Creator-platform indexes (referalsys.md §3/§10). Idempotent — skips an index
 * if one with the same keys already exists under any name (Mongoose auto-creates
 * the unique ones from the schema's `unique: true`).
 *
 * Collection names are Mongoose's pluralised model names.
 */
const INDEXES = [
  ["creatorprofiles", { referralCode: 1 }, { name: "ux_creator_referralCode", unique: true }],
  ["commissionagreements", { creatorId: 1, status: 1 }, {
    name: "ux_commission_one_active_per_creator",
    unique: true,
    partialFilterExpression: { status: "active" },
  }],
  ["referralsessions", { sessionToken: 1 }, { name: "ux_referral_sessionToken", unique: true }],
  ["referralsessions", { status: 1, expiresAt: 1 }, { name: "ix_referral_status_expiry" }],
  ["creatorrewards", { paymentId: 1 }, { name: "ux_reward_paymentId", unique: true }],
  ["creatorrewards", { status: 1, createdAt: -1 }, { name: "ix_reward_status_recent" }],
  ["creditledgers", { creatorId: 1, createdAt: -1 }, { name: "ix_ledger_creator_recent" }],
  ["payoutrequests", { status: 1, requestedAt: -1 }, { name: "ix_payout_status_recent" }],
  ["creatorevents", { entityType: 1, entityId: 1, createdAt: -1 }, {
    name: "ix_creator_events_entity_recent",
  }],
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
      if (!opts.name) continue;
      try {
        await db.collection(coll).dropIndex(opts.name);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`  ! could not drop ${opts.name}: ${e.message}`);
      }
    }
  },
};
