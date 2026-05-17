/**
 * Enforce uniqueness on contact identifiers used for login + OTP.
 *
 *   - email (already unique via Mongoose schema, but we re-assert via
 *     `ix_users_email_ci` on the lowercased form so SignUp("Foo@x.com")
 *     can't collide with an existing "foo@x.com").
 *   - profile.contactPhone normalised — sparse unique so users without
 *     a phone don't all collide on null.
 *
 * Strategy: build the indexes with `unique: true, sparse: true`. If
 * existing data violates the constraint, the migration logs the offending
 * docs and aborts so an operator can deduplicate by hand. This is safer
 * than silently dropping duplicates.
 */
module.exports = {
  async up(db) {
    const users = db.collection("users");

    // Email — case-insensitive collation. Existing `ix_users_email` is case
    // sensitive; the new index complements it. We do NOT drop the old one —
    // some queries rely on its exact-match speed.
    const emailDupes = await users
      .aggregate([
        {
          $group: {
            _id: { $toLower: "$email" },
            count: { $sum: 1 },
            ids: { $push: "$_id" },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();
    if (emailDupes.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `  ! email case-insensitive duplicates found, deduplicate before re-running:`,
      );
      // eslint-disable-next-line no-console
      console.error(emailDupes);
      throw new Error("email_ci_uniqueness_violation");
    }
    await users.createIndex(
      { email: 1 },
      {
        name: "ix_users_email_ci",
        unique: true,
        collation: { locale: "en", strength: 2 },
      },
    );
    // eslint-disable-next-line no-console
    console.log("  + ix_users_email_ci on users");

    // Phone — only enforce on docs that actually have a value.
    const phoneDupes = await users
      .aggregate([
        { $match: { "profile.contactPhone": { $type: "string", $ne: "" } } },
        {
          $group: {
            _id: "$profile.contactPhone",
            count: { $sum: 1 },
            ids: { $push: "$_id" },
          },
        },
        { $match: { count: { $gt: 1 } } },
      ])
      .toArray();
    if (phoneDupes.length > 0) {
      // eslint-disable-next-line no-console
      console.error(
        `  ! phone duplicates found, deduplicate before re-running:`,
      );
      // eslint-disable-next-line no-console
      console.error(phoneDupes);
      throw new Error("phone_uniqueness_violation");
    }
    await users.createIndex(
      { "profile.contactPhone": 1 },
      {
        name: "ix_users_phone_unique",
        unique: true,
        partialFilterExpression: {
          "profile.contactPhone": { $type: "string" },
        },
      },
    );
    // eslint-disable-next-line no-console
    console.log("  + ix_users_phone_unique on users");
  },

  async down(db) {
    for (const name of ["ix_users_email_ci", "ix_users_phone_unique"]) {
      try {
        await db.collection("users").dropIndex(name);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(`  ! could not drop ${name}: ${e.message}`);
      }
    }
  },
};
