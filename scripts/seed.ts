/**
 * Seed local MongoDB with the JSON fixtures from server/db/seeds/*.
 * Demo passwords are bcrypt-hashed on insert (12 rounds).
 * Run: npx tsx scripts/seed.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import seedUsers from "../server/db/seeds/users.json";
import seedCompanies from "../server/db/seeds/companies.json";
import seedJobs from "../server/db/seeds/jobs.json";
import seedBootcamps from "../server/db/seeds/bootcamps.json";
import seedApplications from "../server/db/seeds/applications.json";
import seedCampaigns from "../server/db/seeds/campaigns.json";
import { connectMongo } from "../server/db/mongo";
import {
  ApplicationModel,
  BootcampModel,
  CampaignModel,
  CompanyModel,
  EmailTemplateModel,
  JobModel,
  SupportTicketModel,
  UserModel,
} from "../server/db/models";
import { hashPassword } from "../server/auth/password";
import { DEFAULT_SUPPORT_TICKETS } from "../server/db/seeds/support-tickets";
import { DEFAULT_EMAIL_TEMPLATES } from "../server/db/seeds/email-templates";
import mongoose from "mongoose";

function withMongoId<T extends { id: string }>(items: T[]): any[] {
  return items.map((it) => ({ ...(it as any), _id: it.id }));
}

/**
 * Take the seed users array and replace every plaintext `passwordHash`
 * with a freshly-generated bcrypt hash of the same value. This is what
 * production code expects to see at rest.
 */
async function hashSeedPasswords(
  users: Array<{ passwordHash: string; [k: string]: unknown }>,
): Promise<Array<Record<string, unknown>>> {
  return Promise.all(
    users.map(async (u) => ({
      ...u,
      passwordHash: await hashPassword(u.passwordHash),
    })),
  );
}

async function main() {
  // Hard guard — this script wipes every collection. If we're pointed at a
  // production DB by accident (NODE_ENV=production or MONGODB_URI mentions
  // a known prod host), refuse to run unless explicitly overridden with
  // SEED_ALLOW_PROD=true. Refusing loudly beats silent data loss.
  const isProd = process.env.NODE_ENV === "production";
  const uri = process.env.MONGODB_URI ?? "";
  const smellsLikeProd =
    /mongodb\+srv:\/\/.*@.*\.mongodb\.net/.test(uri) &&
    !/staging|dev|test/i.test(uri);
  if ((isProd || smellsLikeProd) && process.env.SEED_ALLOW_PROD !== "true") {
    console.error(
      "[seed] refusing to run — NODE_ENV=production or MONGODB_URI looks like prod.",
    );
    console.error(
      "[seed] If you really mean it, re-run with SEED_ALLOW_PROD=true.",
    );
    process.exit(1);
  }

  await connectMongo();
  console.log("[seed] connected to", mongoose.connection.host);

  await Promise.all([
    UserModel.deleteMany({}),
    CompanyModel.deleteMany({}),
    JobModel.deleteMany({}),
    ApplicationModel.deleteMany({}),
    BootcampModel.deleteMany({}),
    CampaignModel.deleteMany({}),
    SupportTicketModel.deleteMany({}),
    EmailTemplateModel.deleteMany({}),
  ]);
  console.log("[seed] wiped collections");

  const hashedUsers = await hashSeedPasswords(seedUsers as never);
  console.log("[seed] bcrypt-hashed", hashedUsers.length, "passwords");

  await UserModel.insertMany(withMongoId(hashedUsers as never));
  await CompanyModel.insertMany(withMongoId(seedCompanies as any));
  await JobModel.insertMany(withMongoId(seedJobs as any));
  await BootcampModel.insertMany(withMongoId(seedBootcamps as any));
  await ApplicationModel.insertMany(withMongoId(seedApplications as any));
  await CampaignModel.insertMany(withMongoId(seedCampaigns as any));
  await SupportTicketModel.insertMany(withMongoId(DEFAULT_SUPPORT_TICKETS as any));
  await EmailTemplateModel.insertMany(withMongoId(DEFAULT_EMAIL_TEMPLATES as any));

  console.log("[seed] inserted:");
  console.log("  users        ", await UserModel.countDocuments());
  console.log("  companies    ", await CompanyModel.countDocuments());
  console.log("  jobs         ", await JobModel.countDocuments());
  console.log("  bootcamps    ", await BootcampModel.countDocuments());
  console.log("  applications ", await ApplicationModel.countDocuments());
  console.log("  campaigns    ", await CampaignModel.countDocuments());
  console.log("  tickets      ", await SupportTicketModel.countDocuments());
  console.log("  templates    ", await EmailTemplateModel.countDocuments());

  await mongoose.disconnect();
  console.log("[seed] done.");
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
