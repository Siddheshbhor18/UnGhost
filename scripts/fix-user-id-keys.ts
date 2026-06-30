/**
 * One-off repair: re-key user docs whose Mongo `_id` is NOT the app's string
 * id. This happens when a doc was inserted with a plain `id` field instead of
 * `_id` (the e2e global-setup bug) — Mongo then assigns an ObjectId `_id`, so
 * getUserById(session.user.id) → findById(_id) always misses and the account
 * bounces off any user-guarded page (e.g. /upgrade → /login → /dashboard).
 *
 * `_id` is immutable, so we re-create the doc with `_id = id` and delete the
 * old one. Idempotent + safe: only touches docs that are actually mis-keyed,
 * and skips if a correctly-keyed doc already exists.
 *
 * Run once:  npx tsx scripts/fix-user-id-keys.ts
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";

loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv({ path: path.join(process.cwd(), ".env") });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const users = mongoose.connection.collection("users");

  // Scoped to the known e2e demo accounts only — the records the buggy
  // global-setup mis-keyed. Widen this list if you find others.
  const DEMO_EMAILS = ["alice@demo.test", "hr@stark.test"];
  const candidates = await users
    .find({ email: { $in: DEMO_EMAILS }, id: { $type: "string" } })
    .toArray();

  let fixed = 0;
  let skipped = 0;
  for (const doc of candidates) {
    const stringId = doc.id as string;
    if (doc._id === stringId) {
      skipped++;
      continue; // already correctly keyed
    }
    // Don't clobber an existing correctly-keyed doc.
    const existing = await users.findOne({ _id: stringId as never });
    if (existing) {
      console.log(`[skip] ${stringId} already exists with correct _id`);
      skipped++;
      continue;
    }
    const { _id, ...rest } = doc;
    // A unique `email` index means the old + new rows can't coexist, so delete
    // the mis-keyed row first, then insert the correctly-keyed copy. If the
    // insert fails, restore the original so we never lose the account.
    await users.deleteOne({ _id });
    try {
      await users.insertOne({ _id: stringId as never, ...rest });
    } catch (err) {
      await users.insertOne(doc);
      throw err;
    }
    console.log(`[fixed] ${doc.email ?? stringId}: ${String(_id)} -> ${stringId}`);
    fixed++;
  }

  console.log(`\nDone. fixed=${fixed} skipped=${skipped} scanned=${candidates.length}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
