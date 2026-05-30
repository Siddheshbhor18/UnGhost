/**
 * Purge demo/seed records from the live DB so real users never see fake
 * jobs/companies/bootcamps. SURGICAL: deletes only records whose ids/refs
 * trace back to the seed fixtures. Real signups (uuid/nanoid ids) and config
 * collections (emailtemplates, auditlogs) are left untouched.
 *
 * Always backs up EVERY collection to scripts/backups/<ts>/ first.
 *
 * Dry-run (default):  npx tsx scripts/cleanup-demo.ts
 * Execute deletes:    EXECUTE=true npx tsx scripts/cleanup-demo.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectMongo } from "../server/db/mongo";
import seedUsers from "../server/db/seeds/users.json";
import seedCompanies from "../server/db/seeds/companies.json";
import seedJobs from "../server/db/seeds/jobs.json";
import seedBootcamps from "../server/db/seeds/bootcamps.json";
import seedApplications from "../server/db/seeds/applications.json";
import seedCampaigns from "../server/db/seeds/campaigns.json";
import { DEFAULT_SUPPORT_TICKETS } from "../server/db/seeds/support-tickets";
import {
  UserModel,
  CompanyModel,
  JobModel,
  ApplicationModel,
  BootcampModel,
  CampaignModel,
  SupportTicketModel,
  PaymentSubmissionModel,
  SponsorshipModel,
  InMailModel,
  NotificationModel,
  MessageThreadModel,
  MessageModel,
  SavedJobModel,
  NotInterestedModel,
  ModerationFlagModel,
  AICoachConversationModel,
  LiveSessionModel,
  LiveSessionMessageModel,
  LiveSessionAttendeeModel,
  SessionRecordingModel,
} from "../server/db/models";

const EXECUTE = process.env.EXECUTE === "true";

const ids = (arr: Array<{ id: string }>) => arr.map((x) => x.id);
const userIds = ids(seedUsers as never);
const companyIds = ids(seedCompanies as never);
const jobIds = ids(seedJobs as never);
const bootcampIds = ids(seedBootcamps as never);
const campaignIds = ids(seedCampaigns as never);
const appIds = ids(seedApplications as never);
const ticketIds = ids(DEFAULT_SUPPORT_TICKETS as never);

async function backupAll(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  const db = mongoose.connection.db;
  const colls = await db.listCollections().toArray();
  for (const c of colls) {
    const docs = await db.collection(c.name).find({}).toArray();
    fs.writeFileSync(
      path.join(dir, `${c.name}.json`),
      JSON.stringify(docs, null, 2),
    );
    console.log(`  backed up ${c.name.padEnd(24)} ${docs.length}`);
  }
}

type Plan = { name: string; model: any; filter: Record<string, unknown> };

async function run() {
  await connectMongo();
  console.log("[cleanup] connected to", mongoose.connection.host);
  console.log("[cleanup] EXECUTE =", EXECUTE, "(dry-run unless true)\n");

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join("scripts", "backups", stamp);
  console.log("[cleanup] backing up all collections ->", backupDir);
  await backupAll(backupDir);
  console.log("");

  // Demo message threads -> their ids, so we can purge their messages too.
  const demoThreads = await MessageThreadModel.find({
    $or: [{ recruiterId: { $in: userIds } }, { studentId: { $in: userIds } }],
  })
    .select("_id")
    .lean();
  const threadIds = demoThreads.map((t: any) => String(t._id));

  // Demo live sessions -> their ids, so we can purge their messages/attendees.
  const demoSessions = await LiveSessionModel.find({
    $or: [
      { bootcampId: { $in: bootcampIds } },
      { instructorId: { $in: userIds } },
    ],
  })
    .select("_id")
    .lean();
  const sessionIds = demoSessions.map((s: any) => String(s._id));

  const anyUser = { $in: userIds };
  const plans: Plan[] = [
    { name: "users", model: UserModel, filter: { _id: { $in: userIds } } },
    { name: "companies", model: CompanyModel, filter: { _id: { $in: companyIds } } },
    { name: "jobs", model: JobModel, filter: { _id: { $in: jobIds } } },
    { name: "bootcamps", model: BootcampModel, filter: { _id: { $in: bootcampIds } } },
    { name: "campaigns", model: CampaignModel, filter: { _id: { $in: campaignIds } } },
    { name: "supporttickets", model: SupportTicketModel, filter: { _id: { $in: ticketIds } } },
    {
      name: "applications",
      model: ApplicationModel,
      filter: { $or: [{ _id: { $in: appIds } }, { studentId: anyUser }, { jobId: { $in: jobIds } }] },
    },
    {
      name: "sponsorships",
      model: SponsorshipModel,
      filter: { $or: [{ recruiterId: anyUser }, { studentId: anyUser }, { bootcampId: { $in: bootcampIds } }] },
    },
    { name: "inmails", model: InMailModel, filter: { $or: [{ recruiterId: anyUser }, { studentId: anyUser }] } },
    { name: "notifications", model: NotificationModel, filter: { userId: anyUser } },
    { name: "messages", model: MessageModel, filter: { $or: [{ threadId: { $in: threadIds } }, { senderId: anyUser }] } },
    { name: "messagethreads", model: MessageThreadModel, filter: { _id: { $in: threadIds } } },
    { name: "savedjobs", model: SavedJobModel, filter: { $or: [{ studentId: anyUser }, { jobId: { $in: jobIds } }] } },
    { name: "notinterested", model: NotInterestedModel, filter: { $or: [{ studentId: anyUser }, { jobId: { $in: jobIds } }] } },
    { name: "moderationflags", model: ModerationFlagModel, filter: { $or: [{ recruiterId: anyUser }, { studentId: anyUser }] } },
    { name: "aicoachconvos", model: AICoachConversationModel, filter: { userId: anyUser } },
    { name: "paymentsubmissions", model: PaymentSubmissionModel, filter: { userId: anyUser } },
    { name: "livesessionmessages", model: LiveSessionMessageModel, filter: { sessionId: { $in: sessionIds } } },
    { name: "livesessionattendees", model: LiveSessionAttendeeModel, filter: { sessionId: { $in: sessionIds } } },
    { name: "sessionrecordings", model: SessionRecordingModel, filter: { sessionId: { $in: sessionIds } } },
    { name: "livesessions", model: LiveSessionModel, filter: { _id: { $in: sessionIds } } },
  ];

  console.log("[cleanup] demo records found per collection:");
  let total = 0;
  for (const p of plans) {
    let n = 0;
    try {
      n = await p.model.countDocuments(p.filter);
    } catch (e: any) {
      console.log(`  ${p.name.padEnd(22)} SKIP (${e.message})`);
      continue;
    }
    total += n;
    const kept = await p.model.countDocuments({});
    console.log(`  ${p.name.padEnd(22)} demo=${String(n).padEnd(5)} total=${kept}`);
    if (EXECUTE && n > 0) {
      const res = await p.model.deleteMany(p.filter);
      console.log(`      -> deleted ${res.deletedCount}`);
    }
  }

  console.log(`\n[cleanup] ${EXECUTE ? "DELETED" : "would delete"} ${total} demo records.`);
  console.log("[cleanup] KEPT untouched: emailtemplates, auditlogs, processedtxns, partners, real users/jobs.");
  if (!EXECUTE) console.log("[cleanup] dry-run only. Re-run with EXECUTE=true to apply.");

  await mongoose.disconnect();
  console.log("[cleanup] done.");
}

run().catch((err) => {
  console.error("[cleanup] failed:", err);
  process.exit(1);
});
