/**
 * Set (or reset) an admin account's password to a strong, uncommitted value.
 *
 * WHY THIS EXISTS
 * The seed fixtures ship every account with the demo password "demo".
 * "demo" is in public breach corpora, so Chrome/Google flag it the moment
 * you sign in ("this password appeared in a data breach"). The cure is NOT
 * code — it's giving the real admin a strong password that was never
 * committed to the repo. This script does exactly that, one account at a
 * time, reading the new password from the environment so it never lands in
 * shell history or git.
 *
 * USAGE
 *   ADMIN_EMAIL=root@noghost.test ADMIN_PASSWORD='<a-strong-unique-password>' \
 *     npx tsx scripts/set-admin-password.ts
 *
 * The password must satisfy the same policy as signup (8+ chars, one
 * uppercase, one digit). Pick something long and unique — a passphrase from
 * a password manager is ideal. Run it once per admin account you own.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import { UserModel } from "../server/db/models";
import { hashPassword, checkPasswordPolicy } from "../server/auth/password";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error(
      "[set-admin-password] Missing env. Run:\n" +
        "  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<strong>' npx tsx scripts/set-admin-password.ts",
    );
    process.exit(1);
  }

  // Refuse the very password that caused the breach alert in the first place.
  if (password === "demo") {
    console.error(
      "[set-admin-password] Refusing to set 'demo' — that is the breached password we're replacing.",
    );
    process.exit(1);
  }

  const policy = checkPasswordPolicy(password);
  if (!policy.ok) {
    console.error(`[set-admin-password] Weak password: ${policy.reason}`);
    process.exit(1);
  }

  await connectMongo();

  const passwordHash = await hashPassword(password);
  const res = await UserModel.updateOne(
    { email, role: "admin" },
    { $set: { passwordHash } },
  );

  if (res.matchedCount === 0) {
    console.error(
      `[set-admin-password] No admin account found for ${email}. ` +
        "Check the email, or confirm the account has role 'admin'.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`[set-admin-password] Updated password for ${email} (bcrypt, 12 rounds).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[set-admin-password] failed:", err);
  process.exit(1);
});
