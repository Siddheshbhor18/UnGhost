import path from "node:path";
import { config as loadEnv } from "dotenv";
import mongoose from "mongoose";
import type { FullConfig } from "@playwright/test";
import { hashPassword } from "../../server/auth/password";

// Load the same env Next reads so MONGODB_URI resolves identically.
// .env.local wins over .env (Next's precedence). Playwright runs from the
// project root, so process.cwd() is the repo root.
loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv({ path: path.join(process.cwd(), ".env") });

/**
 * Demo accounts the auth specs sign in as — kept in lockstep with
 * server/db/seeds/users.json (password "demo"). We upsert ONLY these two,
 * idempotently, so the suite is hermetic: it never assumes the DB was
 * pre-seeded and never deletes anything. That keeps it green on any
 * developer's database without a destructive `npm run seed`.
 *
 * Records are intentionally minimal:
 *   - No `profile.contactPhone` — the unique `ix_users_phone_unique` index is
 *     partial on string phones, so omitting it avoids the E11000 that bit us
 *     in prod (Sentry UNGHOST-2).
 *   - authorize() only gates on status (banned/suspended/soft_deleted) and the
 *     password, and /dashboard only checks role — so this is enough to sign in
 *     and land on the role's home.
 */
const DEMO_USERS = [
  {
    id: "usr_e2e_alice",
    email: "alice@demo.test",
    role: "student",
    name: "Alice Rao",
  },
  {
    id: "usr_e2e_hr",
    email: "hr@stark.test",
    role: "recruiter",
    name: "Pepper Potts",
    companyId: "co_stark",
    isCompanyAdmin: true,
  },
];

async function ensureDemoUsers(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "[e2e] MONGODB_URI is not set — cannot ensure demo accounts. Check .env.local.",
    );
  }
  await mongoose.connect(uri);
  try {
    const users = mongoose.connection.collection("users");
    const passwordHash = await hashPassword("demo");
    for (const u of DEMO_USERS) {
      const res = await users.updateOne(
        { email: u.email },
        {
          $setOnInsert: {
            ...u,
            passwordHash,
            status: "active",
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
      if (res.upsertedCount) {
        console.log(`[e2e] seeded demo account ${u.email}`);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Fail loudly if the target server isn't actually unGhost. The entire E2E
 * mystery this setup was written to prevent: the suite silently ran against a
 * DIFFERENT app that happened to occupy the port, producing seven cryptic
 * "element not found" failures. Assert the brand marker so a port collision is
 * an obvious, actionable error instead. Polls so it also tolerates a cold boot.
 */
async function assertUnghostServing(baseURL: string): Promise<void> {
  const deadline = Date.now() + 90_000;
  let lastErr = "not reachable";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseURL, { signal: AbortSignal.timeout(10_000) });
      const html = await res.text();
      if (/unghost/i.test(html)) return;
      lastErr = 'reachable but no "unGhost" marker — a different app is on this port';
    } catch (err) {
      lastErr = (err as Error).message;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(
    `[e2e] could not confirm unGhost at ${baseURL}: ${lastErr}. ` +
      "Free the port or set PLAYWRIGHT_BASE_URL to where unGhost runs.",
  );
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ??
    config.projects[0]?.use?.baseURL ??
    "http://localhost:3100";
  await assertUnghostServing(baseURL);
  await ensureDemoUsers();
}
