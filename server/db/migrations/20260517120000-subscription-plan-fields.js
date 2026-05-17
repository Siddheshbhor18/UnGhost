/**
 * Subscription plan fields on users + indexes.
 *
 *   - plan            : "free" | "pro" | "premium"   (default "free")
 *   - planType        : "free" | "monthly" | "lifetime"
 *   - planActivatedAt : ISO string
 *   - planExpiresAt   : ISO string (pro only)
 *   - lastBillingTxnId: PhonePe txn id
 *
 * Backfills every existing user to `plan: "free"` so the quota gates
 * behave correctly on day-one of the rollout. The ix_users_plan_expires
 * index supports the daily expiry sweep that downgrades pro → free.
 *
 * Idempotent: skips users that already have a `plan` set.
 */
module.exports = {
  async up(db) {
    const res = await db.collection("users").updateMany(
      { plan: { $exists: false } },
      { $set: { plan: "free", planType: "free" } },
    );
    // eslint-disable-next-line no-console
    console.log(`  + backfilled plan=free on ${res.modifiedCount} user(s)`);

    const wanted = [
      [{ plan: 1 }, { name: "ix_users_plan" }],
      [
        { planExpiresAt: 1 },
        {
          name: "ix_users_planExpiresAt",
          partialFilterExpression: { planExpiresAt: { $type: "string" } },
        },
      ],
    ];
    const existing = await db.collection("users").indexes().catch(() => []);
    for (const [keys, opts] of wanted) {
      const dup = existing.find(
        (ix) =>
          Object.keys(ix.key).length === Object.keys(keys).length &&
          Object.keys(keys).every((k) => ix.key[k] === keys[k]),
      );
      if (dup) {
        // eslint-disable-next-line no-console
        console.log(`  = ${opts.name} skipped — ${dup.name} already covers it`);
        continue;
      }
      await db.collection("users").createIndex(keys, opts);
      // eslint-disable-next-line no-console
      console.log(`  + ${opts.name} on users`);
    }
  },

  async down(db) {
    for (const name of ["ix_users_plan", "ix_users_planExpiresAt"]) {
      try {
        await db.collection("users").dropIndex(name);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`  ! could not drop ${name}: ${e.message}`);
      }
    }
    await db.collection("users").updateMany(
      {},
      {
        $unset: {
          plan: "",
          planType: "",
          planActivatedAt: "",
          planExpiresAt: "",
          lastBillingTxnId: "",
        },
      },
    );
  },
};
