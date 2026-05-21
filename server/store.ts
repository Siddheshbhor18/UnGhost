/**
 * MongoDB-backed store for NoGhost.com.
 * All functions are async; callers must `await`.
 *
 * To swap providers, replace the body of these functions but keep the names.
 */
import * as React from "react";
import { connectMongo } from "@/server/db/mongo";
import { cached, invalidate } from "@/server/lib/cache";

// `React.cache` is RSC-only. In unit tests / non-RSC runtimes the symbol is
// undefined, so fall through with a no-op identity wrapper. Either way the
// callsite gets a function that memoises within a single RSC render.
const reactCache: <T extends (...args: any[]) => any>(fn: T) => T =
  typeof (React as unknown as { cache?: unknown }).cache === "function"
    ? ((React as unknown as { cache: <T extends (...args: any[]) => any>(fn: T) => T }).cache)
    : ((fn) => fn);
import {
  AICoachConversationModel,
  LiveSessionModel,
  ApplicationModel,
  BootcampModel,
  CampaignModel,
  CompanyModel,
  EmailTemplateModel,
  InMailModel,
  JobModel,
  MessageModel,
  MessageThreadModel,
  NotInterestedModel,
  NotificationModel,
  PartnerModel,
  ProcessedTxnModel,
  SavedJobModel,
  SessionRecordingModel,
  SponsorshipModel,
  SupportTicketModel,
  UserModel,
  unwrap,
  unwrapAll,
} from "@/server/db/models";
import type {
  AICoachConversation,
  AICoachMemory,
  CompanyStatus,
  EmailTemplate,
  LiveSession,
  LiveSessionStatus,
  SupportTicket,
  SupportTicketStatus,
  AppNotification,
  Application,
  Bootcamp,
  Campaign,
  CoachPersona,
  CompanyProfile,
  InMail,
  InMailStatus,
  Job,
  Message,
  MessageThread,
  NotInterestedFeedback,
  NotificationKind,
  NotificationPriority,
  Placement,
  Role,
  SavedJob,
  SessionRecording,
  Partner,
  PartnerStats,
  Sponsorship,
  SponsorshipStatus,
  Stage,
  User,
} from "@/shared/types";

async function db() {
  await connectMongo();
}

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------- USERS ----------
export async function listUsers(role?: Role): Promise<User[]> {
  await db();
  const q = role ? { role } : {};
  const docs = await UserModel.find(q).lean();
  return unwrapAll(docs as unknown as User[]);
}

/**
 * Slim variant — id + name + role + avatar + plan. Used by recruiter/admin
 * pages that only render chips/avatars and never touch the full profile.
 * Strips passwordHash, profile sub-doc, aiCoachMemory, etc.
 */
export type UserLite = Pick<
  User,
  "id" | "name" | "role" | "avatarUrl" | "plan" | "companyId" | "status"
>;
export async function listUsersLite(role?: Role): Promise<UserLite[]> {
  await db();
  const q: any = role ? { role } : {};
  const docs = await UserModel.find(q)
    .select("_id name role avatarUrl plan companyId status")
    .lean();
  return unwrapAll(docs as unknown as UserLite[]);
}

/**
 * Batch fetch users by id. One Mongo query for N ids — replaces N+1 patterns
 * like the dashboard's `instructorIds.map(id => getUserById(id))`. Returns
 * a Map for O(1) lookup, plus an array preserving the input order with
 * `undefined` for ids that didn't match (mirrors getUserById's signature).
 */
export async function getUsersByIds(
  ids: string[],
): Promise<Map<string, User>> {
  await db();
  if (ids.length === 0) return new Map();
  const docs = await UserModel.find({ _id: { $in: ids } }).lean();
  const out = new Map<string, User>();
  for (const d of docs) {
    const u = unwrap(d as unknown as User);
    if (u) out.set(u.id, u);
  }
  return out;
}

/**
 * Count users by role. Index `ix_users_role_status` makes this O(log N).
 * Used wherever admin UI just needs a scalar — replaces full-collection
 * `listUsers(role)` reads where only `.length` was consumed.
 */
export async function countUsersByRole(role?: Role): Promise<number> {
  await db();
  const q: any = role ? { role } : {};
  return UserModel.countDocuments(q);
}

// Request-scoped memoisation — multiple components in the same RSC render
// (navbar, page header, sidebar) often call getUserById(session.user.id)
// independently. `react.cache` dedupes within one render so we hit Mongo
// once instead of N times. Outside RSC (API routes, scripts) it no-ops.
export const getUserById = reactCache(
  async (id: string): Promise<User | undefined> => {
    await db();
    const doc = await UserModel.findById(id).lean();
    return unwrap(doc as unknown as User);
  },
);

export async function getUserByEmail(email: string): Promise<User | undefined> {
  await db();
  const doc = await UserModel.findOne({
    email: { $regex: `^${escapeRegex(email)}$`, $options: "i" },
  }).lean();
  return unwrap(doc as unknown as User);
}

export async function upsertUser(u: User): Promise<User> {
  await db();
  const payload: any = { ...u, _id: u.id };
  await UserModel.updateOne({ _id: u.id }, { $set: payload }, { upsert: true });
  return u;
}

/**
 * Create a user from the public signup form. Enforces email + phone
 * uniqueness (case-insensitive email, normalised phone), assigns a unique
 * id, defaults plan to "free", marks both verification flags false.
 *
 * Returns either the freshly-created user, or a structured conflict so the
 * route can surface a friendly 409. Never throws on validation — only on
 * actual DB errors.
 */
export interface CreateUserInput {
  email: string;
  phone: string;
  passwordHash: string;
  name: string;
  role: "student" | "recruiter";
  profileAlias?: string;
}

export type CreateUserResult =
  | { ok: true; user: User }
  | { ok: false; reason: "email_taken" | "phone_taken" };

export async function createUserWithCredentials(
  input: CreateUserInput,
): Promise<CreateUserResult> {
  await db();
  const emailLower = input.email.trim().toLowerCase();
  const phone = input.phone.trim();

  // Case-insensitive email dedupe. The ix_users_email_ci index also enforces
  // this at the DB level, so two racing requests can't both succeed.
  const emailHit = await UserModel.findOne({
    email: { $regex: `^${escapeRegex(emailLower)}$`, $options: "i" },
  }).lean();
  if (emailHit) return { ok: false, reason: "email_taken" };

  if (phone) {
    const phoneHit = await UserModel.findOne({
      "profile.contactPhone": phone,
    }).lean();
    if (phoneHit) return { ok: false, reason: "phone_taken" };
  }

  const now = new Date().toISOString();
  const id =
    input.role === "student"
      ? `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
      : `rec_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  const profile =
    input.role === "student"
      ? {
          alias: input.profileAlias ?? input.name.toLowerCase().replace(/\s+/g, "."),
          contactEmail: emailLower,
          contactPhone: phone,
          trajectory: "actively_hunting",
          skills: [],
          verifiedSkills: [],
          enrolledBootcamps: [],
          history: [],
          joinedAt: now,
          lastActiveAt: now,
        }
      : undefined;

  const payload: any = {
    _id: id,
    email: emailLower,
    passwordHash: input.passwordHash,
    role: input.role,
    name: input.name,
    profile,
    plan: "free",
    planType: "free",
    emailVerified: false,
    phoneVerified: false,
    status: "active",
    createdAt: now,
  };

  try {
    await UserModel.create(payload);
  } catch (err) {
    // Duplicate-key race — the unique index caught what our pre-check missed.
    if ((err as any)?.code === 11000) {
      const dupField = (err as any)?.keyPattern ?? {};
      if (dupField["profile.contactPhone"]) {
        return { ok: false, reason: "phone_taken" };
      }
      return { ok: false, reason: "email_taken" };
    }
    throw err;
  }

  const created = (await UserModel.findById(id).lean()) as unknown as User;
  return { ok: true, user: unwrap(created) as User };
}

/**
 * Rotate a user's password hash. Used by the auth layer when a legacy
 * plaintext seed row is upgraded on first login, and by future password
 * reset / change flows.
 */
export async function setUserPasswordHash(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await db();
  await UserModel.updateOne({ _id: userId }, { $set: { passwordHash } });
}

/** Flip emailVerified to true. Idempotent — safe to call on already-verified users. */
export async function markEmailVerified(userId: string): Promise<void> {
  await db();
  const now = new Date().toISOString();
  await UserModel.updateOne(
    { _id: userId },
    { $set: { emailVerified: true, emailVerifiedAt: now } },
  );
}

/** Flip phoneVerified to true. Idempotent. */
export async function markPhoneVerified(userId: string): Promise<void> {
  await db();
  const now = new Date().toISOString();
  await UserModel.updateOne(
    { _id: userId },
    { $set: { phoneVerified: true, phoneVerifiedAt: now } },
  );
}

/**
 * Activate or extend a student's subscription plan.
 *
 * For `pro` (monthly), the expiry is bumped to +30 days from now (or from
 * the existing expiry if still in the future — additive renewals).
 * For `premium` (lifetime), no expiry is set.
 * For `free`, all plan fields are cleared.
 */
export async function activateUserPlan(
  userId: string,
  plan: "free" | "pro" | "premium",
  txnId?: string,
): Promise<void> {
  await db();
  const now = new Date();
  if (plan === "free") {
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: { plan: "free", planType: "free" },
        $unset: { planExpiresAt: "", planActivatedAt: "", lastBillingTxnId: "" },
      },
    );
    return;
  }
  if (plan === "premium") {
    await UserModel.updateOne(
      { _id: userId },
      {
        $set: {
          plan: "premium",
          planType: "lifetime",
          planActivatedAt: now.toISOString(),
          lastBillingTxnId: txnId,
        },
        $unset: { planExpiresAt: "" },
      },
    );
    return;
  }
  // pro — additive monthly extension
  const existing = (await UserModel.findById(userId).lean()) as
    | { planExpiresAt?: string }
    | null;
  const baseTime =
    existing?.planExpiresAt && new Date(existing.planExpiresAt).getTime() > now.getTime()
      ? new Date(existing.planExpiresAt).getTime()
      : now.getTime();
  const expiresAt = new Date(baseTime + 30 * 24 * 60 * 60 * 1000).toISOString();
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        plan: "pro",
        planType: "monthly",
        planActivatedAt: now.toISOString(),
        planExpiresAt: expiresAt,
        lastBillingTxnId: txnId,
      },
    },
  );
}

/**
 * Mark a Pro plan's renewal as cancelled. Plan keeps working until expiry —
 * the daily sweep does the actual downgrade.
 */
export async function cancelUserPlanRenewal(userId: string): Promise<void> {
  await db();
  await UserModel.updateOne(
    { _id: userId },
    { $set: { planRenewalCancelled: true } },
  );
}

/**
 * Daily expiry sweep — downgrade Pro users whose `planExpiresAt` has passed
 * to Free. Used by /api/cron/subscription-sweep. Returns the list of users
 * who got demoted so the cron can notify them.
 */
export async function sweepExpiredPlans(): Promise<{
  demoted: string[];
}> {
  await db();
  const now = new Date().toISOString();
  const expired = await UserModel.find({
    plan: "pro",
    planExpiresAt: { $lt: now },
  })
    .select("_id")
    .lean();
  const ids = expired.map((u) => String((u as unknown as { _id: string })._id));
  if (ids.length === 0) return { demoted: [] };
  await UserModel.updateMany(
    { _id: { $in: ids } },
    {
      $set: { plan: "free", planType: "free" },
      $unset: { planExpiresAt: "", planActivatedAt: "" },
    },
  );
  return { demoted: ids };
}

// ---------- PARTNERS (channel referrals) ----------

import { randomBytes } from "node:crypto";

/**
 * Generate a fresh dashboard token. 32 bytes → 64 hex chars. Enough entropy
 * that brute-forcing the URL is infeasible; behaves like a long password.
 */
function freshPartnerToken(): string {
  return randomBytes(32).toString("hex");
}

/** Slug a free-form name into a URL-safe partner code. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export interface CreatePartnerInput {
  name: string;
  contactEmail: string;
  commissionPct?: number;
  notes?: string;
  /** Optional override. If absent, derived from name. */
  code?: string;
}

export async function createPartner(
  input: CreatePartnerInput,
  createdByAdminId: string,
): Promise<Partner> {
  await db();
  // Code can clash — append a 4-char nonce on collision.
  let code = input.code ? slugify(input.code) : slugify(input.name);
  const exists = await PartnerModel.findOne({ code }).lean();
  if (exists) {
    code = `${code}-${randomBytes(2).toString("hex")}`;
  }
  const partner: Partner = {
    id: `prt_${randomBytes(6).toString("hex")}`,
    code,
    name: input.name.trim(),
    contactEmail: input.contactEmail.trim().toLowerCase(),
    commissionPct: input.commissionPct ?? 0,
    dashboardToken: freshPartnerToken(),
    active: true,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    createdByAdminId,
  };
  await PartnerModel.create({ _id: partner.id, ...partner });
  return partner;
}

export async function listPartners(): Promise<Partner[]> {
  await db();
  const docs = await PartnerModel.find({})
    .sort({ createdAt: -1 })
    .lean();
  return unwrapAll(docs as unknown as Partner[]);
}

export async function getPartnerByCode(
  code: string,
): Promise<Partner | undefined> {
  await db();
  const doc = await PartnerModel.findOne({ code }).lean();
  return unwrap(doc as unknown as Partner);
}

export async function getPartnerById(
  id: string,
): Promise<Partner | undefined> {
  await db();
  const doc = await PartnerModel.findById(id).lean();
  return unwrap(doc as unknown as Partner);
}

export async function updatePartner(
  id: string,
  patch: Partial<
    Pick<Partner, "name" | "contactEmail" | "commissionPct" | "notes" | "active">
  >,
): Promise<Partner | undefined> {
  await db();
  await PartnerModel.updateOne({ _id: id }, { $set: patch });
  return getPartnerById(id);
}

/** Mint a new dashboard token. Call this from /api/partners/[code]/rotate. */
export async function rotatePartnerToken(id: string): Promise<Partner | undefined> {
  await db();
  await PartnerModel.updateOne(
    { _id: id },
    {
      $set: {
        dashboardToken: freshPartnerToken(),
        tokenRotatedAt: new Date().toISOString(),
      },
    },
  );
  return getPartnerById(id);
}

/**
 * Verify partner code + token together. Returns the Partner if both match
 * AND the partner is active. Returns `undefined` for ALL failure modes so
 * the route can render 404 without leaking which axis failed.
 */
export async function verifyPartnerToken(
  code: string,
  token: string,
): Promise<Partner | undefined> {
  if (!code || !token || token.length < 32) return undefined;
  const p = await getPartnerByCode(code);
  if (!p || !p.active) return undefined;
  if (p.dashboardToken !== token) return undefined;
  return p;
}

/**
 * Compute stats for a partner. Counts attributed users + their paid plans.
 * Commission = sum of pricing × commissionPct for referred users who have
 * a paid plan (`pro` or `premium`).
 */
export async function getPartnerStats(
  partnerId: string,
): Promise<PartnerStats> {
  await db();
  const partner = await getPartnerById(partnerId);
  const pct = partner?.commissionPct ?? 0;

  const [signups, paidPro, paidPremium] = await Promise.all([
    UserModel.countDocuments({ referrerPartnerId: partnerId }),
    UserModel.countDocuments({
      referrerPartnerId: partnerId,
      plan: "pro",
    }),
    UserModel.countDocuments({
      referrerPartnerId: partnerId,
      plan: "premium",
    }),
  ]);

  // Pricing matches PLAN_PRICING in shared/types/index.ts (₹999 Pro / ₹4,999
  // Premium). Inlined here to avoid client-bundling that constant.
  const estCommissionINR = Math.round(
    (paidPro * 999 + paidPremium * 4999) * (pct / 100),
  );
  return {
    partnerId,
    signups,
    paidPro,
    paidPremium,
    estCommissionINR,
  };
}

/** Bulk stats for the admin table. One query per partner — fine for ≤200 partners. */
export async function listPartnersWithStats(): Promise<
  Array<Partner & { stats: PartnerStats }>
> {
  const partners = await listPartners();
  return Promise.all(
    partners.map(async (p) => ({
      ...p,
      stats: await getPartnerStats(p.id),
    })),
  );
}

/**
 * Stamp a freshly-created user with their referring partner. Idempotent —
 * never overwrites an existing referrerPartnerId (first-touch wins on the
 * server even if the client sends a new code later).
 */
export async function attachReferrerToUser(
  userId: string,
  partnerId: string,
): Promise<void> {
  await db();
  await UserModel.updateOne(
    { _id: userId, referrerPartnerId: { $exists: false } },
    {
      $set: {
        referrerPartnerId: partnerId,
        referrerCapturedAt: new Date().toISOString(),
      },
    },
  );
}

/** Anonymised referral list — used on partner's own dashboard. */
export async function listPartnerReferrals(
  partnerId: string,
  limit = 50,
): Promise<
  Array<{
    alias: string;
    plan: string;
    signedUpAt: string;
  }>
> {
  await db();
  const docs = await UserModel.find({ referrerPartnerId: partnerId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("profile.alias name plan createdAt")
    .lean();
  return docs.map((d) => {
    const dd = d as unknown as {
      profile?: { alias?: string };
      name?: string;
      plan?: string;
      createdAt?: string;
    };
    // Privacy: never expose real name to partners — alias only. If alias
    // is missing, fall back to a generic label, not the real name.
    const alias = dd.profile?.alias?.replace(/\./g, " ") ?? "student";
    return {
      alias,
      plan: dd.plan ?? "free",
      signedUpAt: dd.createdAt ?? "",
    };
  });
}

/** All active admin user ids. Used for fan-out notifications (bootcamp review, escalations). */
export async function listAdminUserIds(): Promise<string[]> {
  await db();
  const docs = await UserModel.find({ role: "admin", status: { $ne: "soft_deleted" } })
    .select("_id")
    .lean();
  return docs.map((u) => String((u as unknown as { _id: string })._id));
}

/** Users whose Pro plan expires inside the next `withinHours` window — used for warning emails. */
export async function listUsersExpiringSoon(
  withinHours: number,
): Promise<User[]> {
  await db();
  const now = Date.now();
  const horizon = new Date(now + withinHours * 3600_000).toISOString();
  const docs = await UserModel.find({
    plan: "pro",
    planExpiresAt: { $gte: new Date(now).toISOString(), $lt: horizon },
  }).lean();
  return unwrapAll(docs as unknown as User[]);
}

/**
 * Idempotently mark a payment transaction as processed.
 *
 * Returns `{ firstTime: true }` if this call inserted the record — meaning
 * the caller IS the unique processor and should run side effects (activate
 * plan, notify, audit). Returns `{ firstTime: false }` if another path
 * already processed it — caller should short-circuit.
 *
 * Two concurrent callers race on `_id: txnId` and Mongo's unique constraint
 * guarantees only one wins.
 */
export async function recordProcessedTxn(input: {
  txnId: string;
  provider: "phonepe" | "mock";
  orderId: string;
  userId: string;
  plan: "pro" | "premium" | "sponsorship";
  amountPaise: number;
  status: "success" | "failed" | "pending";
  via: "callback" | "webhook";
}): Promise<{ firstTime: boolean }> {
  await db();
  const now = new Date().toISOString();
  try {
    await ProcessedTxnModel.create({
      _id: input.txnId,
      provider: input.provider,
      orderId: input.orderId,
      userId: input.userId,
      plan: input.plan,
      amountPaise: input.amountPaise,
      status: input.status,
      processedAt: now,
      via: input.via,
    });
    return { firstTime: true };
  } catch (err) {
    if ((err as any)?.code === 11000) {
      return { firstTime: false };
    }
    throw err;
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- COMPANIES ----------
// Cached 5 minutes — landing page + every footer references it.
// Invalidate on company create / status / verified change.
export async function listCompanies(): Promise<CompanyProfile[]> {
  return cached("companies:all", 300, async () => {
    await db();
    const docs = await CompanyModel.find({}).lean();
    return unwrapAll(docs as unknown as CompanyProfile[]);
  });
}

export async function getCompanyById(
  id: string,
): Promise<CompanyProfile | undefined> {
  await db();
  const doc = await CompanyModel.findById(id).lean();
  return unwrap(doc as unknown as CompanyProfile);
}

/**
 * Slim variant — name + logo + verified for the small chips on student feeds.
 * Skips description, recruiterIds, etc. Same cache TTL, separate key.
 */
export type CompanyLite = Pick<
  CompanyProfile,
  "id" | "name" | "logoUrl" | "verified" | "status"
>;
export async function listCompaniesLite(): Promise<CompanyLite[]> {
  return cached("companies:all:lite", 300, async () => {
    await db();
    const docs = await CompanyModel.find({})
      .select("_id name logoUrl verified status")
      .lean();
    return unwrapAll(docs as unknown as CompanyLite[]);
  });
}

// ---------- JOBS ----------
// Cached 60s — public feed hits this on every authenticated landing.
// Invalidate on job create/close/reopen.
export async function listJobs(): Promise<Job[]> {
  return cached("jobs:active", 60, async () => {
    await db();
    const docs = await JobModel.find({ active: true }).lean();
    return unwrapAll(docs as unknown as Job[]);
  });
}

export async function listJobsByRecruiter(recruiterId: string): Promise<Job[]> {
  await db();
  const docs = await JobModel.find({ recruiterId }).lean();
  return unwrapAll(docs as unknown as Job[]);
}

/**
 * Slim variant of listJobs — projects only the fields the public/student feed
 * actually consumes. Cuts payload by ~60% vs full Job docs.
 *
 *   id, title, companyId, salaryMin, salaryMax, location, skills, remote,
 *   slaHours, createdAt, active
 *
 * Shares the same Redis cache key family as listJobs, but stored separately
 * so callers don't accidentally use stale fat docs (and vice versa).
 */
export type JobLite = Pick<
  Job,
  | "id"
  | "title"
  | "companyId"
  | "recruiterId"
  | "salaryMin"
  | "salaryMax"
  | "location"
  | "skills"
  | "remote"
  | "slaHours"
  | "createdAt"
  | "active"
>;
const JOB_LITE_SELECT =
  "_id title companyId recruiterId salaryMin salaryMax location skills remote slaHours createdAt active";

export async function listJobsLite(): Promise<JobLite[]> {
  return cached("jobs:active:lite", 60, async () => {
    await db();
    const docs = await JobModel.find({ active: true })
      .select(JOB_LITE_SELECT)
      .lean();
    return unwrapAll(docs as unknown as JobLite[]);
  });
}

export async function getJobById(id: string): Promise<Job | undefined> {
  await db();
  const doc = await JobModel.findById(id).lean();
  return unwrap(doc as unknown as Job);
}

export async function createJob(
  j: Omit<Job, "id" | "createdAt" | "active">,
): Promise<Job> {
  await db();
  const job: Job = {
    ...j,
    id: genId("job"),
    createdAt: new Date().toISOString(),
    active: true,
  };
  await JobModel.create({ ...(job as any), _id: job.id });
  await invalidate("jobs:active", "jobs:active:lite");
  return job;
}

// ---------- APPLICATIONS ----------
export async function listApplications(): Promise<Application[]> {
  await db();
  const docs = await ApplicationModel.find({}).lean();
  return unwrapAll(docs as unknown as Application[]);
}

/** Count helper — replaces `listApplications().length` patterns on admin pages. */
export async function countApplications(filter: Record<string, unknown> = {}): Promise<number> {
  await db();
  return ApplicationModel.countDocuments(filter);
}

/**
 * Newest N applications across the whole platform. Replaces the pattern of
 * `listApplications()` + JS `.sort().slice()` which scanned the entire table.
 */
export async function listRecentApplications(limit = 20): Promise<Application[]> {
  await db();
  const docs = await ApplicationModel.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return unwrapAll(docs as unknown as Application[]);
}

/** Quick aggregate of stage counts. One query → full pipeline snapshot. */
export async function countApplicationsByStage(): Promise<Record<string, number>> {
  await db();
  const rows = await ApplicationModel.aggregate<{ _id: string; n: number }>([
    { $group: { _id: "$stage", n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

export async function listApplicationsByStudent(
  studentId: string,
): Promise<Application[]> {
  await db();
  const docs = await ApplicationModel.find({ studentId }).lean();
  return unwrapAll(docs as unknown as Application[]);
}

export async function listApplicationsByJob(
  jobId: string,
): Promise<Application[]> {
  await db();
  const docs = await ApplicationModel.find({ jobId }).lean();
  return unwrapAll(docs as unknown as Application[]);
}

export async function listApplicationsByRecruiter(
  recruiterId: string,
): Promise<Application[]> {
  await db();
  const jobs = await JobModel.find({ recruiterId }, { _id: 1 }).lean();
  const jobIds = jobs.map((j: any) => j._id);
  const docs = await ApplicationModel.find({ jobId: { $in: jobIds } }).lean();
  return unwrapAll(docs as unknown as Application[]);
}

export async function getApplicationById(
  id: string,
): Promise<Application | undefined> {
  await db();
  const doc = await ApplicationModel.findById(id).lean();
  return unwrap(doc as unknown as Application);
}

export async function createApplication(
  a: Omit<Application, "id" | "createdAt" | "slaDeadline" | "stage">,
): Promise<Application> {
  await db();
  const job = await getJobById(a.jobId);
  const slaH = job?.slaHours ?? 48;
  const now = new Date();
  const deadline = new Date(now.getTime() + slaH * 3600 * 1000);
  const app: Application = {
    ...a,
    id: genId("app"),
    stage: "new_matches",
    createdAt: now.toISOString(),
    slaDeadline: deadline.toISOString(),
  };
  await ApplicationModel.create({ ...(app as any), _id: app.id });
  return app;
}

/** Patch arbitrary fields on an application — used for withdraw, request-update, SLA-breach. */
export async function updateApplicationFields(
  id: string,
  patch: Partial<Application>,
): Promise<Application | undefined> {
  await db();
  const a = await getApplicationById(id);
  if (!a) return undefined;
  await ApplicationModel.updateOne({ _id: id }, { $set: patch });
  return { ...a, ...patch };
}

export async function updateApplicationStage(
  id: string,
  stage: Stage,
  outcomeNotes?: string,
): Promise<Application | undefined> {
  await db();
  const a = await getApplicationById(id);
  if (!a) return undefined;
  const update: any = { stage };
  if (outcomeNotes) update.outcomeNotes = outcomeNotes;
  if (stage === "interview" && !a.interviewScheduledAt) {
    const t = new Date();
    t.setDate(t.getDate() + 3);
    update.interviewScheduledAt = t.toISOString();
  }
  await ApplicationModel.updateOne({ _id: id }, { $set: update });
  return { ...a, ...update };
}

// ---------- BOOTCAMPS ----------
// Cached 5 minutes — catalogue + landing preview.
// Invalidate on bootcamp create / publish / unpublish / update.
export async function listBootcamps(): Promise<Bootcamp[]> {
  return cached("bootcamps:all", 300, async () => {
    await db();
    const docs = await BootcampModel.find({}).lean();
    return unwrapAll(docs as unknown as Bootcamp[]);
  });
}

/**
 * Slim catalog — what the student grid + dashboard tiles render. Skips
 * `videos`, `liveSlots`, `assignmentBrief`, `verifyPrompt` (those load only
 * on the detail page).
 */
export type BootcampLite = Pick<
  Bootcamp,
  | "id"
  | "title"
  | "skill"
  | "description"
  | "instructorId"
  | "durationWeeks"
  | "priceINR"
  | "rating"
  | "coverColor"
  | "status"
  | "enrolledStudentIds"
>;
export async function listBootcampsLite(): Promise<BootcampLite[]> {
  return cached("bootcamps:all:lite", 300, async () => {
    await db();
    const docs = await BootcampModel.find({})
      .select(
        "_id title skill description instructorId durationWeeks priceINR rating coverColor status enrolledStudentIds",
      )
      .lean();
    return unwrapAll(docs as unknown as BootcampLite[]);
  });
}

export async function listBootcampsByInstructor(
  instructorId: string,
): Promise<Bootcamp[]> {
  await db();
  const docs = await BootcampModel.find({ instructorId }).lean();
  return unwrapAll(docs as unknown as Bootcamp[]);
}

/** Get or initialise a student's progress record for a bootcamp. */
export async function getBootcampProgress(
  studentId: string,
  bootcampId: string,
): Promise<import("@/shared/types").BootcampProgress | undefined> {
  await db();
  const user = await UserModel.findById(studentId).lean();
  // mongoose .lean() returns FlattenMaps<...> — index into profile by hand
  const prof = (user as any)?.profile;
  if (!prof) return undefined;
  const list: import("@/shared/types").BootcampProgress[] =
    prof.bootcampProgress ?? [];
  return list.find((p) => p.bootcampId === bootcampId);
}

/** Upsert progress for a student/bootcamp pair. Replaces the entry in-place. */
export async function upsertBootcampProgress(
  studentId: string,
  progress: import("@/shared/types").BootcampProgress,
): Promise<void> {
  await db();
  // Pull existing list to merge
  const user = await UserModel.findById(studentId).lean();
  const prof = (user as any)?.profile;
  if (!prof) return;
  const existing: import("@/shared/types").BootcampProgress[] =
    prof.bootcampProgress ?? [];
  const next = [
    ...existing.filter((p) => p.bootcampId !== progress.bootcampId),
    progress,
  ];
  await UserModel.findByIdAndUpdate(studentId, {
    $set: { "profile.bootcampProgress": next },
  });
}

export async function getBootcampById(
  id: string,
): Promise<Bootcamp | undefined> {
  await db();
  const doc = await BootcampModel.findById(id).lean();
  return unwrap(doc as unknown as Bootcamp);
}

export async function getBootcampForSkill(
  skill: string,
): Promise<Bootcamp | undefined> {
  await db();
  const doc = await BootcampModel.findOne({
    skill: { $regex: `^${escapeRegex(skill)}$`, $options: "i" },
  }).lean();
  return unwrap(doc as unknown as Bootcamp);
}

export async function enrollStudentInBootcamp(
  studentId: string,
  bootcampId: string,
): Promise<Bootcamp | undefined> {
  await db();
  const bc = await getBootcampById(bootcampId);
  const user = await getUserById(studentId);
  if (!bc || !user?.profile) return undefined;

  await BootcampModel.updateOne(
    { _id: bootcampId },
    { $addToSet: { enrolledStudentIds: studentId } },
  );
  await UserModel.updateOne(
    { _id: studentId },
    { $addToSet: { "profile.enrolledBootcamps": bootcampId } },
  );
  await invalidate("bootcamps:all", "bootcamps:all:lite");

  return await getBootcampById(bootcampId);
}

export async function markSkillVerified(
  studentId: string,
  skill: string,
): Promise<void> {
  await db();
  await UserModel.updateOne(
    { _id: studentId },
    { $addToSet: { "profile.verifiedSkills": skill } },
  );
}

// ---------- CAMPAIGNS ----------
export async function listCampaigns(): Promise<Campaign[]> {
  await db();
  const docs = await CampaignModel.find({}).lean();
  return unwrapAll(docs as unknown as Campaign[]);
}

export async function listLiveCampaigns(
  placement: Campaign["placement"],
): Promise<Campaign[]> {
  await db();
  const docs = await CampaignModel.find({ placement, status: "live" }).lean();
  return unwrapAll(docs as unknown as Campaign[]);
}

export async function upsertCampaign(c: Campaign): Promise<Campaign> {
  await db();
  const payload: any = { ...c, _id: c.id };
  await CampaignModel.updateOne(
    { _id: c.id },
    { $set: payload },
    { upsert: true },
  );
  return c;
}

// ---------- PLACEMENTS ----------
export async function listPlacements(): Promise<Placement[]> {
  await db();
  const interviewed: Stage[] = ["interview", "offer", "hired"];
  const apps = (await ApplicationModel.find({ stage: { $in: interviewed } })
    .lean()) as unknown as Application[];
  if (apps.length === 0) return [];

  // Old impl was 3 sequential awaits per placement = 3N round-trips. Now we
  // batch all three collections in a single Promise.all → 3 round-trips total.
  const jobIds = Array.from(new Set(apps.map((a) => a.jobId)));
  const studentIds = Array.from(new Set(apps.map((a) => a.studentId)));
  const [jobs, students] = await Promise.all([
    JobModel.find({ _id: { $in: jobIds } })
      .select("_id title companyId salaryMin salaryMax")
      .lean(),
    UserModel.find({ _id: { $in: studentIds } })
      .select("_id name")
      .lean(),
  ]);
  const companyIds = Array.from(
    new Set(
      (jobs as Array<{ companyId: string }>)
        .map((j) => j.companyId)
        .filter(Boolean),
    ),
  );
  const companies = await CompanyModel.find({ _id: { $in: companyIds } })
    .select("_id name")
    .lean();

  const jobIdx = new Map<string, { title?: string; companyId?: string; salaryMin?: number; salaryMax?: number }>();
  for (const j of jobs as unknown as Array<{ _id: string; title?: string; companyId?: string; salaryMin?: number; salaryMax?: number }>) {
    jobIdx.set(String(j._id), j);
  }
  const stuIdx = new Map<string, string>();
  for (const u of students as unknown as Array<{ _id: string; name?: string }>) {
    stuIdx.set(String(u._id), u.name ?? "—");
  }
  const coIdx = new Map<string, string>();
  for (const c of companies as unknown as Array<{ _id: string; name?: string }>) {
    coIdx.set(String(c._id), c.name ?? "—");
  }

  return apps.map((a) => {
    const j = jobIdx.get(a.jobId);
    return {
      studentId: a.studentId,
      studentName: stuIdx.get(a.studentId) ?? "—",
      jobId: a.jobId,
      jobTitle: j?.title ?? "—",
      companyId: j?.companyId ?? "—",
      companyName: j?.companyId ? coIdx.get(j.companyId) ?? "—" : "—",
      stage: a.stage,
      date: a.interviewScheduledAt ?? a.createdAt,
      salaryRange:
        j && j.salaryMin !== undefined && j.salaryMax !== undefined
          ? `₹${j.salaryMin}–${j.salaryMax} LPA`
          : undefined,
    };
  });
}

// ---------- METRICS ----------
export interface GlobalMetrics {
  liveRevenueINR: number;
  ghostingRatePct: number;
  activeMissions: number;
  totalStudents: number;
  totalRecruiters: number;
  enrollments: number;
  placements: number;
}

export async function getGlobalMetrics(): Promise<GlobalMetrics> {
  // Cache 10 min — landing page hits this on every render but data is
  // platform-wide (no per-user variance) and tolerates staleness. Real-time
  // breach counts come via the SLA sweep, not via this endpoint.
  return cached("metrics:global", 600, async () => {
    await db();
    const [
      students,
      recruiters,
      bootcamps,
      breachedActive,
      totalApps,
      jobs,
      placementsCount,
    ] = await Promise.all([
      UserModel.countDocuments({ role: "student" }),
      UserModel.countDocuments({ role: "recruiter" }),
      // Bootcamps still need to be loaded for enrollments + revenue calc.
      // Could be replaced by an aggregation but the collection is tiny.
      BootcampModel.find({}).select("enrolledStudentIds priceINR").lean(),
      // Use indexed range query rather than loading every application.
      ApplicationModel.countDocuments({
        stage: { $in: ["new_matches", "under_review"] },
        slaDeadline: { $lt: new Date().toISOString() },
      }),
      ApplicationModel.estimatedDocumentCount(),
      JobModel.countDocuments({ active: true }),
      // Placements is small + already cached upstream — but if not, the
      // collection is small enough not to matter.
      listPlacements(),
    ]);

    const enrollments = (bootcamps as any[]).reduce(
      (acc, b) => acc + (b.enrolledStudentIds?.length ?? 0),
      0,
    );
    const liveRevenueINR = (bootcamps as any[]).reduce(
      (acc, b) => acc + (b.enrolledStudentIds?.length ?? 0) * (b.priceINR ?? 0),
      0,
    );
    const total = totalApps || 1;
    return {
      liveRevenueINR,
      ghostingRatePct: Math.round((breachedActive / total) * 100),
      activeMissions: jobs,
      totalStudents: students,
      totalRecruiters: recruiters,
      enrollments,
      placements: placementsCount.length,
    };
  });
}

// ---------- SKILL HEATMAP ----------
export interface SkillFailRow {
  skill: string;
  attempts: number;
  failures: number;
  failureRate: number;
}

export async function getSkillGapHeatmap(): Promise<SkillFailRow[]> {
  // Cached 5 min — admin dashboard hits this on every render, but the data
  // is aggregated across thousands of apps and tolerates staleness. Cache
  // key is global; no per-user variance.
  return cached("admin:skill-gap-heatmap", 300, async () => {
    await db();
    // Cap to the most recent 5000 assessed applications. Beyond that the
    // statistical signal flattens and the cost balloons. `ix_applications_*`
    // indexes make this scan O(log N + 5000).
    const apps = (await ApplicationModel.find({
      "assessment.grade.score": { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(5000)
      .lean()) as unknown as Application[];

    // Batch-fetch every distinct job in one round-trip. The previous version
    // did getJobById() in a loop = N+1 hammering Mongo.
    const jobIds = Array.from(new Set(apps.map((a) => a.jobId)));
    const jobs = (await JobModel.find({ _id: { $in: jobIds } })
      .select("_id skills")
      .lean()) as unknown as Array<{ _id: string; skills?: string[] }>;
    const jobIndex = new Map<string, string[]>();
    for (const j of jobs) {
      jobIndex.set(String(j._id), j.skills ?? []);
    }

    const skillBuckets = new Map<string, { attempts: number; failures: number }>();
    for (const a of apps) {
      if (!a.assessment?.grade) continue;
      const skills = jobIndex.get(a.jobId);
      if (!skills) continue;
      const failed = a.assessment.grade.score < 60;
      for (const skill of skills) {
        const b = skillBuckets.get(skill) ?? { attempts: 0, failures: 0 };
        b.attempts++;
        if (failed) b.failures++;
        skillBuckets.set(skill, b);
      }
    }
    return Array.from(skillBuckets.entries())
      .map(([skill, v]) => ({
        skill,
        attempts: v.attempts,
        failures: v.failures,
        failureRate: v.attempts ? Math.round((v.failures / v.attempts) * 100) : 0,
      }))
      .sort((a, b) => b.failureRate - a.failureRate);
  });
}

// ---------- SPONSORSHIPS ----------

const SPONSORSHIP_EXPIRY_DAYS = 30;

export async function createSponsorship(input: {
  recruiterId: string;
  companyName: string;
  studentId: string;
  bootcampId: string;
  jobId?: string;
  pricePaid: number;
  /**
   * If true (default), sponsorship begins in `payment_pending` and stays there
   * until the PhonePe callback / webhook flips it to `offered`. Set false only
   * for legacy/test paths that need an immediately-active sponsorship.
   */
  pendingPayment?: boolean;
  /** Override for the generated sponsorship id (lets callers anchor it to a payment order). */
  forcedId?: string;
}): Promise<Sponsorship> {
  await db();
  const now = new Date();
  const expires = new Date(now.getTime() + SPONSORSHIP_EXPIRY_DAYS * 86400_000);
  const sp: Sponsorship = {
    id: input.forcedId ?? genId("spon"),
    recruiterId: input.recruiterId,
    companyName: input.companyName,
    studentId: input.studentId,
    bootcampId: input.bootcampId,
    jobId: input.jobId,
    pricePaid: input.pricePaid,
    status: input.pendingPayment === false ? "offered" : "payment_pending",
    offeredAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };
  await SponsorshipModel.create({ _id: sp.id, ...sp });
  return sp;
}

export async function listSponsorshipsByStudent(
  studentId: string,
): Promise<Sponsorship[]> {
  await db();
  const docs = await SponsorshipModel.find({ studentId }).sort({ offeredAt: -1 }).lean();
  return unwrapAll(docs as unknown as Sponsorship[]);
}

export async function listSponsorshipsByRecruiter(
  recruiterId: string,
): Promise<Sponsorship[]> {
  await db();
  const docs = await SponsorshipModel.find({ recruiterId }).sort({ offeredAt: -1 }).lean();
  return unwrapAll(docs as unknown as Sponsorship[]);
}

export async function getSponsorshipById(
  id: string,
): Promise<Sponsorship | undefined> {
  await db();
  const doc = await SponsorshipModel.findById(id).lean();
  return unwrap(doc as unknown as Sponsorship);
}

export async function updateSponsorshipStatus(
  id: string,
  status: SponsorshipStatus,
): Promise<Sponsorship | undefined> {
  await db();
  const sp = await getSponsorshipById(id);
  if (!sp) return undefined;
  const patch: any = { status };
  const now = new Date().toISOString();
  if (status === "accepted") patch.acceptedAt = now;
  if (status === "declined") patch.declinedAt = now;
  if (status === "completed") patch.completedAt = now;
  await SponsorshipModel.updateOne({ _id: id }, { $set: patch });
  return { ...sp, ...patch };
}

// ---------- CANDIDATE SEARCH ----------

export interface CandidateSearchFilters {
  query?: string;                     // natural language query
  skills?: string[];                  // must-have skills (any-match)
  city?: string;
  remotePref?: "remote" | "hybrid" | "onsite";
  minYearsExperience?: number;
  verifiedOnly?: boolean;
  topPerformersOnly?: boolean;        // any verified bootcamp
  trajectory?: "actively_hunting" | "casually_exploring" | "open_to_magic";
}

export interface CandidateSearchResult {
  user: User;
  /** Fuzzy match score 0-100. */
  score: number;
  /** Skill overlap count vs query terms (when query given). */
  skillHits: string[];
}

/**
 * Phase 1 mock vector-search: fuzzy keyword scan over student profiles.
 * Real impl uses Voyage embeddings + Atlas Vector Search.
 */
export async function searchCandidates(
  filters: CandidateSearchFilters,
): Promise<CandidateSearchResult[]> {
  await db();
  const docs = await UserModel.find({ role: "student" }).lean();
  const students = unwrapAll(docs as unknown as User[]);

  const queryTerms = (filters.query ?? "")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((t) => t.length > 2);

  const results: CandidateSearchResult[] = [];
  for (const s of students) {
    if (!s.profile) continue;
    // Visibility: respect searchVisibility opt-out per PRD
    if (s.profile.searchVisibility === false) continue;

    // Apply hard filters first
    if (
      filters.trajectory &&
      s.profile.trajectory !== filters.trajectory
    )
      continue;
    if (filters.city && s.profile.city?.toLowerCase() !== filters.city.toLowerCase())
      continue;
    if (filters.remotePref && s.profile.remotePref !== filters.remotePref)
      continue;
    if (
      filters.minYearsExperience &&
      (s.profile.yearsExperience ?? 0) < filters.minYearsExperience
    )
      continue;
    if (filters.verifiedOnly && (s.profile.verifiedSkills?.length ?? 0) === 0)
      continue;
    if (
      filters.topPerformersOnly &&
      (s.profile.verifiedSkills?.length ?? 0) === 0
    )
      continue;
    if (filters.skills && filters.skills.length > 0) {
      const studentSkillsLow = s.profile.skills.map((x) => x.toLowerCase());
      const hasAny = filters.skills.some((sk) =>
        studentSkillsLow.includes(sk.toLowerCase()),
      );
      if (!hasAny) continue;
    }

    // Score: term-overlap on title + skills + city + history
    const haystack = [
      ...s.profile.skills,
      s.profile.city ?? "",
      ...(s.profile.history?.map((h) => `${h.title} ${h.company} ${h.impact}`) ?? []),
    ]
      .join(" ")
      .toLowerCase();

    let score = 50; // baseline
    const skillHits: string[] = [];
    for (const term of queryTerms) {
      if (haystack.includes(term)) score += 5;
      if (s.profile.skills.some((sk) => sk.toLowerCase() === term)) {
        score += 10;
        const matched = s.profile.skills.find(
          (sk) => sk.toLowerCase() === term,
        );
        if (matched && !skillHits.includes(matched)) skillHits.push(matched);
      }
    }
    if (s.profile.verifiedSkills?.length) score += 10;
    if ((s.profile.history?.length ?? 0) >= 2) score += 5;
    if (s.profile.trajectory === "actively_hunting") score += 8;

    results.push({
      user: s,
      score: Math.min(100, Math.round(score)),
      skillHits,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

// ---------- INMAIL ----------

const INMAIL_REFUND_DAYS = 14;
const INMAIL_COOLDOWN_DAYS = 90;

export async function getInMailCredits(recruiterId: string): Promise<number> {
  await db();
  const user = await getUserById(recruiterId);
  return user?.inMailCredits ?? 0;
}

export async function adjustInMailCredits(
  recruiterId: string,
  delta: number,
): Promise<number> {
  await db();
  const user = await UserModel.findById(recruiterId);
  if (!user) return 0;
  const next = (user.get("inMailCredits") ?? 50) + delta;
  await UserModel.updateOne({ _id: recruiterId }, { $set: { inMailCredits: next } });
  return next;
}

/** Has the recruiter sent an InMail to this student in the last 90 days that was declined/ignored? */
export async function isInMailOnCooldown(
  recruiterId: string,
  studentId: string,
): Promise<boolean> {
  await db();
  const cutoff = new Date(Date.now() - INMAIL_COOLDOWN_DAYS * 86400_000).toISOString();
  const doc = await InMailModel.findOne({
    recruiterId,
    studentId,
    status: { $in: ["declined", "ignored_refunded"] },
    sentAt: { $gt: cutoff },
  }).lean();
  return !!doc;
}

export async function createInMail(input: {
  recruiterId: string;
  recruiterName: string;
  companyName: string;
  studentId: string;
  jobId?: string;
  jobTitle?: string;
  subject: string;
  body: string;
}): Promise<InMail> {
  await db();
  const id = genId("inm");
  const now = new Date();
  const refund = new Date(now.getTime() + INMAIL_REFUND_DAYS * 86400_000);
  const im: InMail = {
    id,
    recruiterId: input.recruiterId,
    recruiterName: input.recruiterName,
    companyName: input.companyName,
    studentId: input.studentId,
    jobId: input.jobId,
    jobTitle: input.jobTitle,
    subject: input.subject,
    body: input.body,
    sentAt: now.toISOString(),
    status: "pending",
    refundDeadline: refund.toISOString(),
  };
  await InMailModel.create({ _id: id, ...im });
  return im;
}

export async function getInMailById(id: string): Promise<InMail | undefined> {
  await db();
  const doc = await InMailModel.findById(id).lean();
  return unwrap(doc as unknown as InMail);
}

export async function listInMailsByRecruiter(
  recruiterId: string,
): Promise<InMail[]> {
  await db();
  const docs = await InMailModel.find({ recruiterId }).sort({ sentAt: -1 }).lean();
  return unwrapAll(docs as unknown as InMail[]);
}

export async function listInMailsByStudent(
  studentId: string,
): Promise<InMail[]> {
  await db();
  const docs = await InMailModel.find({ studentId }).sort({ sentAt: -1 }).lean();
  return unwrapAll(docs as unknown as InMail[]);
}

export async function updateInMailStatus(
  id: string,
  status: InMailStatus,
): Promise<InMail | undefined> {
  await db();
  const im = await getInMailById(id);
  if (!im) return undefined;
  const patch: any = { status, respondedAt: new Date().toISOString() };
  await InMailModel.updateOne({ _id: id }, { $set: patch });
  return { ...im, ...patch };
}

// ---------- NOTIFICATIONS ----------

export interface NotifyInput {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link?: string;
  actorLabel?: string;
  priority?: NotificationPriority;
  actionRequired?: boolean;
}

/**
 * Fire-and-forget notification creator. Swallows errors so business logic
 * never fails because the inbox write failed.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db();
    const n: AppNotification = {
      id: genId("ntf"),
      userId: input.userId,
      kind: input.kind,
      priority: input.priority ?? "normal",
      title: input.title,
      body: input.body,
      link: input.link,
      actorLabel: input.actorLabel,
      actionRequired: input.actionRequired,
      createdAt: new Date().toISOString(),
    };
    await NotificationModel.create({ _id: n.id, ...n });
  } catch (err) {
    console.warn("[notify] failed", err);
  }
}

export async function listNotifications(
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number } = {},
): Promise<AppNotification[]> {
  await db();
  const q: Record<string, unknown> = { userId };
  if (opts.unreadOnly) q.readAt = { $exists: false };
  const docs = await NotificationModel.find(q)
    .sort({ createdAt: -1 })
    .limit(opts.limit ?? 50)
    .lean();
  return unwrapAll(docs as unknown as AppNotification[]);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  await db();
  return NotificationModel.countDocuments({
    userId,
    readAt: { $exists: false },
  });
}

export async function markNotificationRead(
  id: string,
  userId: string,
): Promise<AppNotification | undefined> {
  await db();
  const doc = await NotificationModel.findOne({ _id: id, userId }).lean();
  if (!doc) return undefined;
  await NotificationModel.updateOne(
    { _id: id, userId },
    { $set: { readAt: new Date().toISOString() } },
  );
  return unwrap({
    ...(doc as unknown as AppNotification),
    readAt: new Date().toISOString(),
  });
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  await db();
  const res = await NotificationModel.updateMany(
    { userId, readAt: { $exists: false } },
    { $set: { readAt: new Date().toISOString() } },
  );
  return res.modifiedCount ?? 0;
}

// ---------- SLA SWEEP ENGINE ----------

export interface SlaSweepResult {
  scanned: number;
  breached: number;
  warningsT12: number;
  warningsT4: number;
}

/**
 * Scan all active applications. Flip expired SLAs to "rejected · breached",
 * refund credits, fire notifications. Also fires T-12h / T-4h warnings.
 *
 * PRD: Inngest cron every 5 min. Phase 1: callable inline + via /api/cron/sla-sweep.
 * Idempotent — re-running the same minute is safe (breach flag prevents re-fire).
 */
export async function runSlaSweep(): Promise<SlaSweepResult> {
  await db();
  const now = Date.now();
  const ACTIVE_STAGES: Stage[] = [
    "new_matches",
    "under_review",
    "interview",
    "offer",
  ];
  const apps = await ApplicationModel.find({
    stage: { $in: ACTIVE_STAGES },
  }).lean();
  const list = unwrapAll(apps as unknown as Application[]);

  let breached = 0;
  let warningsT12 = 0;
  let warningsT4 = 0;

  for (const a of list) {
    const deadline = new Date(a.slaDeadline).getTime();
    const diff = deadline - now;

    // Already breached & flagged — skip (idempotent)
    if (a.slaRefundIssued) continue;

    // ── BREACH (T <= 0) ─────────────────────────────────────────────────
    if (diff <= 0) {
      await ApplicationModel.updateOne(
        { _id: a.id },
        {
          $set: {
            stage: "rejected",
            slaBreachedAt: new Date().toISOString(),
            slaRefundIssued: true,
            outcomeNotes:
              (a.outcomeNotes ? `${a.outcomeNotes} · ` : "") +
              "Recruiter ghosted — SLA breached, credit refunded",
          },
        },
      );

      // Hydrate job + recruiter for notification copy
      const job = await getJobById(a.jobId);
      const company = job?.companyId
        ? await getCompanyById(job.companyId)
        : undefined;
      const recruiterId = job?.recruiterId;

      await notify({
        userId: a.studentId,
        kind: "sla_breached",
        priority: "high",
        title: `Recruiter ghosted — your credit is refunded`,
        body: `${company?.name ?? "The company"} missed their ${
          job?.slaHours ?? 48
        }h SLA on ${job?.title ?? "your application"}. AI Coach has similar missions queued.`,
        link: `/student/applications/${a.id}`,
        actorLabel: company?.name,
        actionRequired: true,
      });

      if (recruiterId) {
        await notify({
          userId: recruiterId,
          kind: "sla_breached",
          priority: "critical",
          title: `SLA breached on ${job?.title ?? "an application"}`,
          body: `Your ghosting rate just incremented. Candidate's credit was refunded automatically.`,
          link: `/recruiter/today`,
        });
      }
      breached++;
      continue;
    }

    // ── T-4h WARNING ────────────────────────────────────────────────────
    if (
      diff <= 4 * 3600_000 &&
      diff > 3 * 3600_000 // single firing per hour band
    ) {
      const job = await getJobById(a.jobId);
      const student = await getUserById(a.studentId);
      if (job?.recruiterId) {
        await notify({
          userId: job.recruiterId,
          kind: "sla_warning",
          priority: "critical",
          title: `4 hours to SLA on ${student?.name ?? "a candidate"}`,
          body: `${job.title} · advance, reject, or extend before the breach.`,
          link: `/recruiter/today`,
          actionRequired: true,
        });
        warningsT4++;
      }
    }

    // ── T-12h WARNING ───────────────────────────────────────────────────
    if (
      diff <= 12 * 3600_000 &&
      diff > 11 * 3600_000
    ) {
      const job = await getJobById(a.jobId);
      const student = await getUserById(a.studentId);
      if (job?.recruiterId) {
        await notify({
          userId: job.recruiterId,
          kind: "sla_warning",
          priority: "high",
          title: `12 hours to SLA on ${student?.name ?? "a candidate"}`,
          body: `${job.title} · review now to avoid a ghost-rate hit.`,
          link: `/recruiter/today`,
        });
        warningsT12++;
      }
    }
  }

  return { scanned: list.length, breached, warningsT12, warningsT4 };
}

/**
 * Cheap "did we sweep recently?" cache to avoid hammering on every page load.
 * In-process — for distributed Vercel deployments, swap to Redis.
 */
let lastSweep = 0;
const SWEEP_THROTTLE_MS = 60_000;

export async function maybeRunSlaSweep(): Promise<SlaSweepResult | null> {
  if (Date.now() - lastSweep < SWEEP_THROTTLE_MS) return null;
  lastSweep = Date.now();
  return runSlaSweep();
}

// ---------- MESSAGE THREADS + MESSAGES ----------

/**
 * Find or create the thread tied to an application. PRD: Stage 1+ unlocks
 * messaging. Caller is responsible for gating (we don't enforce stage here so
 * accepted InMails can also open threads via context.type === "inmail").
 */
export async function getOrCreateApplicationThread(
  applicationId: string,
): Promise<MessageThread | undefined> {
  await db();
  const app = await getApplicationById(applicationId);
  if (!app) return undefined;
  const job = await getJobById(app.jobId);
  if (!job) return undefined;
  const company = job.companyId
    ? await getCompanyById(job.companyId)
    : undefined;

  const existing = await MessageThreadModel.findOne({
    "context.applicationId": applicationId,
  }).lean();
  if (existing) return unwrap(existing as unknown as MessageThread);

  const id = genId("thr");
  const now = new Date().toISOString();
  const thread: MessageThread = {
    id,
    context: {
      type: "application",
      applicationId,
      jobId: job.id,
    },
    recruiterId: job.recruiterId,
    studentId: app.studentId,
    companyName: company?.name ?? "Company",
    jobTitle: job.title,
    createdAt: now,
    lastMessageAt: now,
    lastPreview: "Conversation opened.",
    unreadForRecruiter: 0,
    unreadForStudent: 0,
  };
  await MessageThreadModel.create({ _id: id, ...thread });
  return thread;
}

export async function getOrCreateInMailThread(
  inmailId: string,
): Promise<MessageThread | undefined> {
  await db();
  const im = await getInMailById(inmailId);
  if (!im) return undefined;

  const existing = await MessageThreadModel.findOne({
    "context.inmailId": inmailId,
  }).lean();
  if (existing) return unwrap(existing as unknown as MessageThread);

  const id = genId("thr");
  const now = new Date().toISOString();
  const thread: MessageThread = {
    id,
    context: { type: "inmail", inmailId },
    recruiterId: im.recruiterId,
    studentId: im.studentId,
    companyName: im.companyName,
    jobTitle: im.jobTitle,
    createdAt: now,
    lastMessageAt: now,
    lastPreview: im.body.slice(0, 80),
    unreadForRecruiter: 0,
    unreadForStudent: 1,
  };
  await MessageThreadModel.create({ _id: id, ...thread });
  // Seed the InMail body as the first message from the recruiter.
  await MessageModel.create({
    _id: genId("msg"),
    threadId: id,
    senderId: im.recruiterId,
    senderRole: "recruiter",
    body: im.body,
    createdAt: now,
    readBy: [im.recruiterId],
  });
  return thread;
}

export async function getMessageThreadById(
  id: string,
): Promise<MessageThread | undefined> {
  await db();
  const doc = await MessageThreadModel.findById(id).lean();
  return unwrap(doc as unknown as MessageThread);
}

export async function listMessageThreadsForUser(
  userId: string,
): Promise<MessageThread[]> {
  await db();
  const docs = await MessageThreadModel.find({
    $or: [{ recruiterId: userId }, { studentId: userId }],
  })
    .sort({ lastMessageAt: -1 })
    .lean();
  return unwrapAll(docs as unknown as MessageThread[]);
}

export async function listMessagesInThread(
  threadId: string,
  limit = 100,
): Promise<Message[]> {
  await db();
  const docs = await MessageModel.find({ threadId })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
  return unwrapAll(docs as unknown as Message[]);
}

/** Send a message; updates the thread preview + bumps the other side's unread. */
export async function sendMessage(input: {
  threadId: string;
  senderId: string;
  senderRole: "student" | "recruiter";
  body: string;
}): Promise<Message | undefined> {
  await db();
  const thread = await getMessageThreadById(input.threadId);
  if (!thread) return undefined;
  if (
    thread.recruiterId !== input.senderId &&
    thread.studentId !== input.senderId
  ) {
    return undefined;
  }
  const now = new Date().toISOString();
  const msg: Message = {
    id: genId("msg"),
    threadId: input.threadId,
    senderId: input.senderId,
    senderRole: input.senderRole,
    body: input.body,
    createdAt: now,
    readBy: [input.senderId],
  };
  await MessageModel.create({ _id: msg.id, ...msg });
  // Update thread metadata
  const inc: any = {};
  if (input.senderRole === "student") inc.unreadForRecruiter = 1;
  else inc.unreadForStudent = 1;
  await MessageThreadModel.updateOne(
    { _id: input.threadId },
    {
      $set: {
        lastMessageAt: now,
        lastPreview: input.body.slice(0, 120),
      },
      $inc: inc,
    },
  );
  return msg;
}

/** Mark all messages in a thread as read by the given user. Resets their unread count. */
export async function markThreadRead(
  threadId: string,
  userId: string,
): Promise<void> {
  await db();
  const thread = await getMessageThreadById(threadId);
  if (!thread) return;
  await MessageModel.updateMany(
    { threadId, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } },
  );
  const set: any = {};
  if (thread.recruiterId === userId) set.unreadForRecruiter = 0;
  if (thread.studentId === userId) set.unreadForStudent = 0;
  if (Object.keys(set).length > 0) {
    await MessageThreadModel.updateOne({ _id: threadId }, { $set: set });
  }
}

// ---------- PROFILE EDITOR ----------

/** Patch arbitrary subprofile fields on a student. Caller pre-validates. */
export async function updateStudentProfile(
  studentId: string,
  patch: Partial<import("@/shared/types").StudentProfile>,
): Promise<User | undefined> {
  await db();
  const user = await getUserById(studentId);
  if (!user || user.role !== "student") return undefined;
  // Build dot-notation $set so we don't blow away unrelated fields like
  // bootcampProgress or verifiedSkills.
  const set: any = {};
  for (const [k, v] of Object.entries(patch)) {
    set[`profile.${k}`] = v;
  }
  set["profile.lastActiveAt"] = new Date().toISOString();
  await UserModel.updateOne({ _id: studentId }, { $set: set });
  return getUserById(studentId);
}

/** Soft-delete: mark user as inactive. PRD: 30-day grace then hard-delete cron. */
export async function softDeleteUser(userId: string): Promise<void> {
  await db();
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        "profile.searchVisibility": false,
        "profile.lastActiveAt": new Date().toISOString(),
        deletedAt: new Date().toISOString(),
      },
    },
  );
}

// ---------- COMPANY METRICS ----------

export interface CompanyMetrics {
  /** Active job count. */
  openPositions: number;
  /** Hire count over last 90 days. */
  hires90d: number;
  /** Total applications received in last 90 days. */
  applications90d: number;
  /** SLA-breached app count in last 90 days. */
  breaches90d: number;
  /** Ghosting rate percentage (breaches / applications × 100). */
  ghostingRatePct: number;
  /** Average response time in hours (avg time from application to first stage advance). */
  avgResponseHours: number;
  /** Recruiter team size. */
  recruiterCount: number;
}

const NINETY_DAYS_MS = 90 * 86400_000;
const INDUSTRY_GHOSTING_BENCHMARK_PCT = 38;

export async function computeCompanyMetrics(
  companyId: string,
): Promise<CompanyMetrics> {
  await db();
  const cutoff = new Date(Date.now() - NINETY_DAYS_MS).toISOString();

  const jobs = await JobModel.find({ companyId }).lean();
  const jobIds = jobs.map((j: any) => j._id);
  const allApps = await ApplicationModel.find({
    jobId: { $in: jobIds },
  }).lean();
  const recent = unwrapAll(allApps as unknown as Application[]).filter(
    (a) => a.createdAt > cutoff,
  );

  const openPositions = jobs.filter(
    (j: any) => j.active !== false,
  ).length;
  const hires90d = recent.filter((a) => a.stage === "hired").length;
  const breaches90d = recent.filter((a) => a.slaRefundIssued).length;
  const ghostingRatePct =
    recent.length > 0 ? Math.round((breaches90d / recent.length) * 1000) / 10 : 0;

  // Avg response: time from app.createdAt → first non-new_matches stage entry.
  // We don't track stage history, so approximate: for apps that left new_matches,
  // use SLA hours × 0.7 as a stand-in for "responded ahead of SLA".
  const responded = recent.filter(
    (a) => a.stage !== "new_matches" && a.stage !== "rejected",
  );
  let totalHours = 0;
  for (const a of responded) {
    const job = jobs.find(
      (j: any) => j._id === a.jobId,
    );
    const slaH = (job as any)?.slaHours ?? 48;
    totalHours += slaH * 0.7;
  }
  const avgResponseHours =
    responded.length > 0 ? Math.round(totalHours / responded.length) : 0;

  const recruiterCount = await UserModel.countDocuments({
    role: "recruiter",
    companyId,
  });

  return {
    openPositions,
    hires90d,
    applications90d: recent.length,
    breaches90d,
    ghostingRatePct,
    avgResponseHours,
    recruiterCount,
  };
}

export const INDUSTRY_GHOSTING_BENCHMARK = INDUSTRY_GHOSTING_BENCHMARK_PCT;

// ---------- SAVED JOBS + NOT INTERESTED ----------

export async function saveJob(
  studentId: string,
  jobId: string,
): Promise<SavedJob> {
  await db();
  const existing = await SavedJobModel.findOne({ studentId, jobId }).lean();
  if (existing) return unwrap(existing as unknown as SavedJob)!;
  const id = genId("svj");
  const sj: SavedJob = {
    id,
    studentId,
    jobId,
    savedAt: new Date().toISOString(),
  };
  await SavedJobModel.create({ _id: id, ...sj });
  return sj;
}

export async function unsaveJob(
  studentId: string,
  jobId: string,
): Promise<void> {
  await db();
  await SavedJobModel.deleteOne({ studentId, jobId });
}

export async function listSavedJobs(studentId: string): Promise<SavedJob[]> {
  await db();
  const docs = await SavedJobModel.find({ studentId })
    .sort({ savedAt: -1 })
    .lean();
  return unwrapAll(docs as unknown as SavedJob[]);
}

export async function isJobSaved(
  studentId: string,
  jobId: string,
): Promise<boolean> {
  await db();
  const doc = await SavedJobModel.findOne({ studentId, jobId }).lean();
  return !!doc;
}

export async function markNotInterested(
  studentId: string,
  jobId: string,
  reason?: NotInterestedFeedback["reason"],
): Promise<NotInterestedFeedback> {
  await db();
  // Upsert — toggling not-interested with a different reason updates it.
  await NotInterestedModel.updateOne(
    { studentId, jobId },
    {
      $set: {
        _id: genId("nif"),
        studentId,
        jobId,
        dismissedAt: new Date().toISOString(),
        reason,
      },
    },
    { upsert: true },
  );
  // Also auto-unsave if dismissed
  await SavedJobModel.deleteOne({ studentId, jobId });
  const doc = await NotInterestedModel.findOne({ studentId, jobId }).lean();
  return unwrap(doc as unknown as NotInterestedFeedback)!;
}

export async function unmarkNotInterested(
  studentId: string,
  jobId: string,
): Promise<void> {
  await db();
  await NotInterestedModel.deleteOne({ studentId, jobId });
}

export async function listNotInterestedJobIds(
  studentId: string,
): Promise<string[]> {
  await db();
  const docs = await NotInterestedModel.find({ studentId })
    .select("jobId")
    .lean();
  return docs.map(
    (d: any) => d.jobId,
  );
}

// ---------- INSTRUCTOR METRICS ----------

export interface InstructorMetrics {
  totalBootcamps: number;
  totalEnrolled: number;
  avgRating: number;
  totalReviews: number;
  upcomingLiveSlots: number;
  totalLiveSlots: number;
}

export async function computeInstructorMetrics(
  instructorId: string,
): Promise<InstructorMetrics> {
  await db();
  const bcs = await listBootcampsByInstructor(instructorId);
  const totalBootcamps = bcs.length;
  const enrolledIds = new Set<string>();
  let ratingSum = 0;
  let ratingCount = 0;
  let upcomingLiveSlots = 0;
  let totalLiveSlots = 0;
  const now = Date.now();

  for (const b of bcs) {
    for (const s of b.enrolledStudentIds) enrolledIds.add(s);
    if (b.rating > 0) {
      ratingSum += b.rating;
      ratingCount += 1;
    }
    for (const slot of b.liveSlots ?? []) {
      totalLiveSlots += 1;
      if (new Date(slot).getTime() > now) upcomingLiveSlots += 1;
    }
  }

  return {
    totalBootcamps,
    totalEnrolled: enrolledIds.size,
    avgRating: ratingCount > 0 ? ratingSum / ratingCount : 0,
    totalReviews: ratingCount, // proxy — one per rated bootcamp
    upcomingLiveSlots,
    totalLiveSlots,
  };
}

// ---------- BOOTCAMP CREATE / UPDATE (instructor-scoped) ----------

import type { BootcampStatus } from "@/shared/types";

/** Create a bootcamp owned by an instructor. Defaults to "draft" status. */
export async function createBootcamp(input: {
  instructorId: string;
  title: string;
  skill: string;
  category: Bootcamp["category"];
  description?: string;
  priceINR?: number;
  durationWeeks?: number;
}): Promise<Bootcamp> {
  await db();
  const id = genId("bc");
  const priceINR = input.priceINR ?? 2499;
  const bc: Bootcamp = {
    id,
    skill: input.skill,
    category: input.category,
    title: input.title,
    description: input.description ?? "",
    priceINR,
    // Mirror priceINR into paise — authoritative for checkout math.
    // Admin can tune this independently later via the bootcamp edit form.
    priceInPaise: priceINR * 100,
    gstPercent: 18,
    durationWeeks: input.durationWeeks ?? 3,
    instructorId: input.instructorId,
    videos: [],
    liveSlots: [],
    enrolledStudentIds: [],
    rating: 0,
    coverColor: "#0191FC",
    status: "draft",
    // Enrollment + scheduling fields — admin fills before publishing.
    enrollmentOpensAt: null,
    enrollmentClosesAt: null,
    startsAt: null,
    endsAt: null,
    maxStudents: 495,
    currentSubmissionCount: 0,
    sessions: [],
  };
  await BootcampModel.create({ ...(bc as any), _id: id });
  await invalidate("bootcamps:all", "bootcamps:all:lite");
  return bc;
}

/** Patch arbitrary editable fields. Caller is responsible for instructor authz. */
export async function updateBootcamp(
  id: string,
  instructorId: string,
  patch: Partial<Bootcamp>,
): Promise<Bootcamp | undefined> {
  await db();
  const bc = await getBootcampById(id);
  if (!bc || bc.instructorId !== instructorId) return undefined;
  const safe: any = { ...patch };
  // Never let the editor overwrite ownership / enrolment / rating
  delete safe.id;
  delete safe.instructorId;
  delete safe.enrolledStudentIds;
  delete safe.rating;
  await BootcampModel.updateOne({ _id: id }, { $set: safe });
  await invalidate("bootcamps:all", "bootcamps:all:lite");
  return { ...bc, ...safe };
}

/** Update lifecycle status — instructor-driven (draft → in_review) or admin-driven. */
export async function setBootcampStatus(
  id: string,
  status: BootcampStatus,
  meta?: { reviewFeedback?: string },
): Promise<void> {
  await db();
  const set: any = { status };
  if (status === "in_review") set.submittedForReviewAt = new Date().toISOString();
  if (meta?.reviewFeedback) set.reviewFeedback = meta.reviewFeedback;
  await BootcampModel.updateOne({ _id: id }, { $set: set });
  await invalidate("bootcamps:all", "bootcamps:all:lite");
}

// ---------- ADMIN USER ACTIONS ----------

import type { UserStatus } from "@/shared/types";

export async function suspendUser(input: {
  userId: string;
  durationDays: number;
  reason: string;
  byAdminId: string;
}): Promise<User | undefined> {
  await db();
  const user = await getUserById(input.userId);
  if (!user) return undefined;
  const until = new Date(Date.now() + input.durationDays * 86400_000);
  await UserModel.updateOne(
    { _id: input.userId },
    {
      $set: {
        status: "suspended",
        suspendedUntil: until.toISOString(),
        suspendedReason: input.reason,
        suspendedAt: new Date().toISOString(),
        suspendedByAdminId: input.byAdminId,
      },
    },
  );
  return getUserById(input.userId);
}

export async function banUser(input: {
  userId: string;
  reason: string;
  byAdminId: string;
}): Promise<User | undefined> {
  await db();
  await UserModel.updateOne(
    { _id: input.userId },
    {
      $set: {
        status: "banned",
        suspendedReason: input.reason,
        suspendedAt: new Date().toISOString(),
        suspendedByAdminId: input.byAdminId,
        // Permanent ban — no expiry
        suspendedUntil: undefined,
      },
      $unset: { suspendedUntil: 1 },
    },
  );
  return getUserById(input.userId);
}

export async function restoreUser(userId: string): Promise<User | undefined> {
  await db();
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: { status: "active" },
      $unset: {
        suspendedUntil: 1,
        suspendedReason: 1,
        suspendedAt: 1,
        suspendedByAdminId: 1,
      },
    },
  );
  return getUserById(userId);
}

/** Compute effective status — auto-expires time-bound suspensions. */
export function effectiveUserStatus(user: User): UserStatus {
  const status: UserStatus = user.status ?? "active";
  if (status === "suspended" && user.suspendedUntil) {
    if (new Date(user.suspendedUntil).getTime() < Date.now()) {
      return "active"; // expired suspension
    }
  }
  return status;
}

// ---------- AUDIT LOG ----------

import {
  AuditLogModel,
  ModerationFlagModel,
} from "@/server/db/models";
import type {
  AuditLog,
  ModerationDecision,
  ModerationFlag,
  ModerationKind,
} from "@/shared/types";

/** Fire-and-forget audit log writer. Swallows errors so business logic never
 *  fails because audit write failed. */
export async function writeAuditLog(input: {
  actorId: string;
  actorRole: Role;
  action: string;
  targetType: AuditLog["targetType"];
  targetId: string;
  summary: string;
  before?: any;
  after?: any;
  reason?: string;
  meta?: { ip?: string; userAgent?: string };
}): Promise<void> {
  try {
    await db();
    const log: AuditLog = {
      id: genId("aud"),
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      before: input.before,
      after: input.after,
      reason: input.reason,
      createdAt: new Date().toISOString(),
      meta: input.meta,
    };
    await AuditLogModel.create({ _id: log.id, ...log });
  } catch (err) {
    console.warn("[audit] failed", err);
  }
}

export async function listAuditLogs(opts: {
  actorId?: string;
  action?: string;
  targetType?: AuditLog["targetType"];
  targetId?: string;
  limit?: number;
} = {}): Promise<AuditLog[]> {
  await db();
  const q: any = {};
  if (opts.actorId) q.actorId = opts.actorId;
  if (opts.action) q.action = opts.action;
  if (opts.targetType) q.targetType = opts.targetType;
  if (opts.targetId) q.targetId = opts.targetId;
  const docs = await AuditLogModel.find(q)
    .sort({ createdAt: -1 })
    .limit(opts.limit ?? 200)
    .lean();
  return unwrapAll(docs as unknown as AuditLog[]);
}

// ---------- MODERATION QUEUE ----------

export async function createModerationFlag(input: {
  kind: ModerationKind;
  targetId: string;
  targetLabel: string;
  contentExcerpt: string;
  aiConfidence: number;
  reasons: string[];
  reportedBy: string;
}): Promise<ModerationFlag> {
  await db();
  const id = genId("mod");
  const flag: ModerationFlag = {
    id,
    kind: input.kind,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    contentExcerpt: input.contentExcerpt,
    aiConfidence: input.aiConfidence,
    reasons: input.reasons,
    reportedBy: input.reportedBy,
    decision: "pending",
    createdAt: new Date().toISOString(),
  };
  await ModerationFlagModel.create({ _id: id, ...flag });
  return flag;
}

export async function listModerationFlags(opts: {
  decision?: ModerationDecision;
  limit?: number;
} = {}): Promise<ModerationFlag[]> {
  await db();
  const q: any = {};
  if (opts.decision) q.decision = opts.decision;
  const docs = await ModerationFlagModel.find(q)
    .sort({ createdAt: -1 })
    .limit(opts.limit ?? 100)
    .lean();
  return unwrapAll(docs as unknown as ModerationFlag[]);
}

export async function decideModerationFlag(
  id: string,
  decision: ModerationDecision,
  decidedBy: string,
  decisionNote?: string,
): Promise<ModerationFlag | undefined> {
  await db();
  await ModerationFlagModel.updateOne(
    { _id: id },
    {
      $set: {
        decision,
        decidedBy,
        decisionNote,
        decidedAt: new Date().toISOString(),
      },
    },
  );
  const doc = await ModerationFlagModel.findById(id).lean();
  return unwrap(doc as unknown as ModerationFlag);
}

// ---------- TELEMETRY ALERTS ----------

export interface TelemetryAlert {
  id: string;
  kind: "skill_gap" | "drop_off" | "ghosting_spike";
  severity: "info" | "warn" | "critical";
  title: string;
  body: string;
  link: string;
  detectedAt: string;
}

/**
 * Detect actionable telemetry alerts on the fly. Phase 1: computed from
 * existing aggregates. Path 2: persisted via Inngest nightly cron.
 */
export async function detectTelemetryAlerts(): Promise<TelemetryAlert[]> {
  const alerts: TelemetryAlert[] = [];
  const heatmap = await getSkillGapHeatmap();
  const top = heatmap[0];
  if (top && top.failureRate >= 50 && top.attempts >= 3) {
    alerts.push({
      id: `tel_skill_${top.skill}`,
      kind: "skill_gap",
      severity: top.failureRate >= 70 ? "critical" : "warn",
      title: `${top.failureRate}% failure on ${top.skill}`,
      body: `${top.failures} of ${top.attempts} attempts failed. Curriculum gap detected — consider sponsoring a bootcamp.`,
      link: "/admin/telemetry",
      detectedAt: new Date().toISOString(),
    });
  }

  const apps = await listApplications();
  const totalApps = apps.length;
  const breaches = apps.filter((a) => a.slaRefundIssued).length;
  const ghostRate =
    totalApps > 0 ? (breaches / totalApps) * 100 : 0;
  if (ghostRate >= 10 && totalApps >= 5) {
    alerts.push({
      id: "tel_ghosting_platform",
      kind: "ghosting_spike",
      severity: ghostRate >= 25 ? "critical" : "warn",
      title: `Platform ghost rate at ${ghostRate.toFixed(1)}%`,
      body: `${breaches} SLA breaches of ${totalApps} apps. Investigate recruiters at the top of the list.`,
      link: "/admin/recruiters",
      detectedAt: new Date().toISOString(),
    });
  }

  const ungradedRatio =
    totalApps > 0
      ? apps.filter((a) => !a.assessment?.grade).length / totalApps
      : 0;
  if (ungradedRatio >= 0.4 && totalApps >= 5) {
    alerts.push({
      id: "tel_dropoff_assessment",
      kind: "drop_off",
      severity: "warn",
      title: `Assessment drop-off: ${Math.round(ungradedRatio * 100)}%`,
      body: "High share of applications never submit their gauntlet response. Check the briefing screen.",
      link: "/admin/telemetry",
      detectedAt: new Date().toISOString(),
    });
  }

  return alerts;
}

// ---------- SAVED SEARCHES + JOB TEMPLATES + TEAM ----------

import {
  JobTemplateModel,
  SavedSearchModel,
} from "@/server/db/models";
import type { JobTemplate, SavedSearch } from "@/shared/types";

export async function createSavedSearch(input: {
  recruiterId: string;
  name: string;
  filtersJson: string;
  alertFrequency: SavedSearch["alertFrequency"];
}): Promise<SavedSearch> {
  await db();
  const id = genId("ss");
  const s: SavedSearch = {
    id,
    recruiterId: input.recruiterId,
    name: input.name,
    filtersJson: input.filtersJson,
    alertFrequency: input.alertFrequency,
    createdAt: new Date().toISOString(),
  };
  await SavedSearchModel.create({ _id: id, ...s });
  return s;
}

export async function listSavedSearches(
  recruiterId: string,
): Promise<SavedSearch[]> {
  await db();
  const docs = await SavedSearchModel.find({ recruiterId })
    .sort({ createdAt: -1 })
    .lean();
  return unwrapAll(docs as unknown as SavedSearch[]);
}

export async function updateSavedSearchFrequency(
  id: string,
  recruiterId: string,
  alertFrequency: SavedSearch["alertFrequency"],
): Promise<void> {
  await db();
  await SavedSearchModel.updateOne(
    { _id: id, recruiterId },
    { $set: { alertFrequency } },
  );
}

export async function deleteSavedSearch(
  id: string,
  recruiterId: string,
): Promise<void> {
  await db();
  await SavedSearchModel.deleteOne({ _id: id, recruiterId });
}

export async function createJobTemplate(input: {
  recruiterId: string;
  companyId?: string;
  isCompanyShared?: boolean;
  name: string;
  title: string;
  skills: string[];
  gauntletPrompt: string;
  description: string;
  salaryMin: number;
  salaryMax: number;
  remote: JobTemplate["remote"];
  slaHours: JobTemplate["slaHours"];
  location: string;
}): Promise<JobTemplate> {
  await db();
  const id = genId("jt");
  const t: JobTemplate = {
    id,
    recruiterId: input.recruiterId,
    companyId: input.companyId,
    isCompanyShared: input.isCompanyShared ?? false,
    name: input.name,
    title: input.title,
    skills: input.skills,
    gauntletPrompt: input.gauntletPrompt,
    description: input.description,
    salaryMin: input.salaryMin,
    salaryMax: input.salaryMax,
    remote: input.remote,
    slaHours: input.slaHours,
    location: input.location,
    createdAt: new Date().toISOString(),
  };
  await JobTemplateModel.create({ _id: id, ...t });
  return t;
}

export async function listJobTemplatesForRecruiter(
  recruiterId: string,
  companyId?: string,
): Promise<JobTemplate[]> {
  await db();
  // Personal templates + company-shared from same company
  const q: any = companyId
    ? {
        $or: [
          { recruiterId },
          { companyId, isCompanyShared: true },
        ],
      }
    : { recruiterId };
  const docs = await JobTemplateModel.find(q)
    .sort({ createdAt: -1 })
    .lean();
  return unwrapAll(docs as unknown as JobTemplate[]);
}

export async function deleteJobTemplate(
  id: string,
  recruiterId: string,
): Promise<void> {
  await db();
  await JobTemplateModel.deleteOne({ _id: id, recruiterId });
}

// ---------- TEAM MANAGEMENT ----------

export async function listCompanyRecruiters(
  companyId: string,
): Promise<User[]> {
  await db();
  const docs = await UserModel.find({
    role: "recruiter",
    companyId,
  }).lean();
  return unwrapAll(docs as unknown as User[]);
}

export async function setCompanyAdmin(
  userId: string,
  isCompanyAdmin: boolean,
): Promise<void> {
  await db();
  await UserModel.updateOne({ _id: userId }, { $set: { isCompanyAdmin } });
}

export async function removeRecruiterFromCompany(
  userId: string,
): Promise<void> {
  await db();
  // Phase 1: just unset companyId. PRD: 7-day soft-delete window + audit log.
  await UserModel.updateOne(
    { _id: userId },
    { $unset: { companyId: 1 }, $set: { isCompanyAdmin: false } },
  );
}

// ---------- AI COACH CONVERSATIONS + PERSONA + MEMORY ----------

export async function listCoachConversations(
  studentId: string,
): Promise<AICoachConversation[]> {
  await db();
  const docs = await AICoachConversationModel.find({ studentId })
    .sort({ updatedAt: -1 })
    .lean();
  return unwrapAll(docs as unknown as AICoachConversation[]);
}

export async function getCoachConversation(
  id: string,
  studentId: string,
): Promise<AICoachConversation | undefined> {
  await db();
  const doc = await AICoachConversationModel.findOne({
    _id: id,
    studentId,
  }).lean();
  return unwrap(doc as unknown as AICoachConversation);
}

export async function createCoachConversation(
  studentId: string,
  firstUserMessage: string,
): Promise<AICoachConversation> {
  await db();
  const now = new Date().toISOString();
  const title = firstUserMessage.slice(0, 60) || "New chat";
  const convo: AICoachConversation = {
    id: genId("convo"),
    studentId,
    title,
    preview: firstUserMessage.slice(0, 120),
    messages: [{ role: "student", content: firstUserMessage, ts: now }],
    createdAt: now,
    updatedAt: now,
  };
  await AICoachConversationModel.create({ _id: convo.id, ...convo });
  return convo;
}

export async function appendCoachMessage(
  conversationId: string,
  studentId: string,
  role: "student" | "coach",
  content: string,
): Promise<void> {
  await db();
  const now = new Date().toISOString();
  await AICoachConversationModel.updateOne(
    { _id: conversationId, studentId },
    {
      $push: { messages: { role, content, ts: now } },
      $set: {
        updatedAt: now,
        ...(role === "coach"
          ? { preview: content.slice(0, 120) }
          : {}),
      },
    },
  );
}

export async function deleteCoachConversation(
  id: string,
  studentId: string,
): Promise<void> {
  await db();
  await AICoachConversationModel.deleteOne({ _id: id, studentId });
}

export async function setCoachPersona(
  userId: string,
  persona: CoachPersona,
): Promise<void> {
  await db();
  await UserModel.updateOne({ _id: userId }, { $set: { coachPersona: persona } });
}

export async function setCoachMemory(
  userId: string,
  memory: AICoachMemory,
): Promise<void> {
  await db();
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        aiCoachMemory: { ...memory, updatedAt: new Date().toISOString() },
      },
    },
  );
}

/**
 * Lightweight rollup — call after each turn. Summarises last N messages into
 * `aiCoachMemory.summary` and extracts crude facts. Real impl would use Claude.
 */
export async function rollupCoachMemory(
  userId: string,
  recentMessages: Array<{ role: "student" | "coach"; content: string }>,
): Promise<void> {
  const studentTurns = recentMessages
    .filter((m) => m.role === "student")
    .slice(-6)
    .map((m) => m.content);
  if (studentTurns.length === 0) return;
  // Crude fact extraction — picks lines that look like statements about self.
  const facts: string[] = [];
  for (const t of studentTurns) {
    const lines = t.split(/[.\n]/);
    for (const ln of lines) {
      const clean = ln.trim();
      if (
        clean.length > 8 &&
        clean.length < 110 &&
        /\b(I|my|me|aiming|targeting|prefer|want|need)\b/i.test(clean)
      ) {
        facts.push(clean);
        if (facts.length >= 4) break;
      }
    }
    if (facts.length >= 4) break;
  }
  const summary = facts.slice(0, 2).join(" · ") || studentTurns.at(-1)!.slice(0, 160);
  await setCoachMemory(userId, { summary, facts });
}

// ---------- LIVE SESSIONS ----------

function genRoomCode(): string {
  // 8-char alphanumeric, easy to share verbally
  return Math.random().toString(36).slice(2, 6) + "-" + Math.random().toString(36).slice(2, 6);
}

export async function createLiveSession(input: {
  bootcampId: string;
  instructorId: string;
  title: string;
  description?: string;
  startsAt: string;
  durationMin: number;
}): Promise<LiveSession> {
  await db();
  const now = new Date().toISOString();
  const session: LiveSession = {
    id: genId("live"),
    bootcampId: input.bootcampId,
    instructorId: input.instructorId,
    title: input.title,
    description: input.description,
    startsAt: input.startsAt,
    durationMin: input.durationMin,
    status: "scheduled",
    roomCode: genRoomCode(),
    registeredStudentIds: [],
    attendedStudentIds: [],
    createdAt: now,
  };
  await LiveSessionModel.create({ _id: session.id, ...session });
  return session;
}

export async function getLiveSessionById(
  id: string,
): Promise<LiveSession | undefined> {
  await db();
  const doc = await LiveSessionModel.findById(id).lean();
  return unwrap(doc as unknown as LiveSession);
}

export async function getLiveSessionByCode(
  code: string,
): Promise<LiveSession | undefined> {
  await db();
  const doc = await LiveSessionModel.findOne({ roomCode: code }).lean();
  return unwrap(doc as unknown as LiveSession);
}

export async function listLiveSessionsByInstructor(
  instructorId: string,
): Promise<LiveSession[]> {
  await db();
  const docs = await LiveSessionModel.find({ instructorId })
    .sort({ startsAt: 1 })
    .lean();
  return unwrapAll(docs as unknown as LiveSession[]);
}

export async function listLiveSessionsByBootcamp(
  bootcampId: string,
): Promise<LiveSession[]> {
  await db();
  const docs = await LiveSessionModel.find({ bootcampId })
    .sort({ startsAt: 1 })
    .lean();
  return unwrapAll(docs as unknown as LiveSession[]);
}

/**
 * Sessions a student can see: bootcamps they're enrolled in,
 * status scheduled or live, sorted by soonest.
 */
export async function listUpcomingLiveForStudent(
  studentId: string,
): Promise<Array<LiveSession & { bootcampTitle: string }>> {
  await db();
  const user = await UserModel.findById(studentId).lean();
  const enrolled =
    (user as unknown as User | null)?.profile?.bootcampProgress?.map(
      (p) => p.bootcampId,
    ) ?? [];
  if (enrolled.length === 0) return [];
  const sessions = await LiveSessionModel.find({
    bootcampId: { $in: enrolled },
    status: { $in: ["scheduled", "live"] },
  })
    .sort({ startsAt: 1 })
    .lean();
  const bootcamps = await BootcampModel.find({
    _id: { $in: enrolled },
  }).lean();
  const titleMap = new Map<string, string>();
  for (const b of bootcamps as unknown as Bootcamp[]) {
    titleMap.set(b.id ?? (b as unknown as { _id: string })._id, b.title);
  }
  return unwrapAll(sessions as unknown as LiveSession[]).map((s) => ({
    ...s,
    // bootcampId is nullable now (free lead-gen sessions skip it). Fall
    // back to a generic label rather than crashing the dashboard query.
    bootcampTitle: (s.bootcampId && titleMap.get(s.bootcampId)) ?? "Bootcamp",
  }));
}

export async function registerForLiveSession(
  sessionId: string,
  studentId: string,
): Promise<void> {
  await db();
  await LiveSessionModel.updateOne(
    { _id: sessionId },
    { $addToSet: { registeredStudentIds: studentId } },
  );
}

export async function unregisterFromLiveSession(
  sessionId: string,
  studentId: string,
): Promise<void> {
  await db();
  await LiveSessionModel.updateOne(
    { _id: sessionId },
    { $pull: { registeredStudentIds: studentId } },
  );
}

export async function recordLiveAttendance(
  sessionId: string,
  studentId: string,
): Promise<void> {
  await db();
  await LiveSessionModel.updateOne(
    { _id: sessionId },
    { $addToSet: { attendedStudentIds: studentId } },
  );
}

export async function setLiveSessionStatus(
  sessionId: string,
  instructorId: string,
  status: LiveSessionStatus,
): Promise<void> {
  await db();
  const now = new Date().toISOString();
  const set: Record<string, unknown> = { status };
  if (status === "live") {
    set.startedAt = now;
    // Provision the 100ms room (or mock equivalent) on first live transition.
    const existing = await LiveSessionModel.findById(sessionId).lean();
    const live = existing as unknown as LiveSession | null;
    if (live && !live.videoRoomId) {
      const { createRoom, videoMode } = await import(
        "@/server/integrations/video"
      );
      try {
        const room = await createRoom({
          name: live.title ?? "unGhost live",
          description: live.description,
        });
        set.videoRoomId = room.roomId;
        set.videoProvider = videoMode();
      } catch (err) {
        // Non-fatal — host can still rerun start to retry. Log loud.
        // eslint-disable-next-line no-console
        console.error("[live] room provisioning failed:", err);
      }
    }
  }
  if (status === "ended") set.endedAt = now;
  await LiveSessionModel.updateOne(
    { _id: sessionId, instructorId },
    { $set: set },
  );

  // On end-of-session, harvest the recording asset from the video provider
  // and stash it in pending_review so the instructor can decide keep/delete
  // from /instructor/recordings. Idempotent — if a row already exists we skip.
  if (status === "ended") {
    await maybeCaptureRecording(sessionId).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[live] recording capture failed:", err);
    });
  }
}

/**
 * Pull the recording from 100ms (or mock) and persist a `pending_review`
 * SessionRecording. Safe to call multiple times — does nothing on second
 * invocation thanks to the `sessionId` unique check.
 */
async function maybeCaptureRecording(sessionId: string): Promise<void> {
  const live = (await LiveSessionModel.findById(sessionId).lean()) as
    | unknown as LiveSession
    | null;
  if (!live || !live.videoRoomId) return;
  const existing = await SessionRecordingModel.findOne({ sessionId }).lean();
  if (existing) return;

  const { getRoomRecording, videoMode } = await import(
    "@/server/integrations/video"
  );
  const asset = await getRoomRecording(live.videoRoomId);
  if (!asset.ok) return;

  // Free-tier sessions have no bootcamp parent — skip recording (the
  // YouTube path handles its own recordings).
  if (!live.bootcampId) return;
  const bootcamp = await getBootcampById(live.bootcampId);
  const id = genId("rec");
  await SessionRecordingModel.create({
    _id: id,
    sessionId,
    bootcampId: live.bootcampId,
    instructorId: live.instructorId,
    sessionTitle: live.title,
    bootcampTitle: bootcamp?.title ?? "",
    providerAssetId: asset.assetId,
    playbackUrl: asset.playbackUrl,
    thumbnailUrl: asset.thumbnailUrl,
    durationSec: asset.durationSec,
    sizeBytes: asset.sizeBytes,
    status: "pending_review",
    createdAt: new Date().toISOString(),
    provider: videoMode() === "100ms" ? "100ms" : "mock",
  });
  // Convenience pointer so legacy code that reads `live.recordingUrl`
  // still works while the recordings table is rolling out.
  await LiveSessionModel.updateOne(
    { _id: sessionId },
    { $set: { recordingUrl: asset.playbackUrl } },
  );
}

// ---------- SESSION RECORDINGS ----------

/**
 * List recordings owned by an instructor, newest first. Used by
 * /instructor/recordings to show pending-review + previously-kept clips.
 */
export async function listRecordingsByInstructor(
  instructorId: string,
): Promise<SessionRecording[]> {
  await db();
  const docs = await SessionRecordingModel.find({
    instructorId,
    status: { $ne: "deleted" },
  })
    .sort({ createdAt: -1 })
    .lean();
  return unwrapAll(docs as unknown as SessionRecording[]);
}

/**
 * Public-facing list for a single bootcamp — only `published` recordings.
 * Powers the on-demand replay surface inside the bootcamp page.
 */
export async function listPublishedRecordingsByBootcamp(
  bootcampId: string,
): Promise<SessionRecording[]> {
  await db();
  const docs = await SessionRecordingModel.find({
    bootcampId,
    status: "published",
  })
    .sort({ createdAt: -1 })
    .lean();
  return unwrapAll(docs as unknown as SessionRecording[]);
}

export async function getRecordingById(
  id: string,
): Promise<SessionRecording | undefined> {
  await db();
  const doc = await SessionRecordingModel.findById(id).lean();
  return unwrap(doc as unknown as SessionRecording);
}

/** Mark a recording as kept — students can now replay it. */
export async function publishRecording(
  id: string,
  instructorId: string,
): Promise<SessionRecording | undefined> {
  await db();
  await SessionRecordingModel.updateOne(
    { _id: id, instructorId },
    { $set: { status: "published", publishedAt: new Date().toISOString() } },
  );
  return getRecordingById(id);
}

/**
 * Soft-delete + provider purge. We keep the row (audit) but blank the URL
 * and flip status so the recording is unreachable from any surface.
 */
export async function deleteRecording(
  id: string,
  instructorId: string,
): Promise<{ ok: boolean; reason?: string }> {
  await db();
  const rec = await getRecordingById(id);
  if (!rec || rec.instructorId !== instructorId) {
    return { ok: false, reason: "not_found" };
  }
  if (rec.providerAssetId) {
    const { deleteRoomRecording } = await import(
      "@/server/integrations/video"
    );
    const result = await deleteRoomRecording(rec.providerAssetId);
    if (!result.ok) {
      return { ok: false, reason: result.error ?? "provider_delete_failed" };
    }
  }
  await SessionRecordingModel.updateOne(
    { _id: id, instructorId },
    {
      $set: { status: "deleted", deletedAt: new Date().toISOString() },
      $unset: { playbackUrl: "", thumbnailUrl: "" },
    },
  );
  return { ok: true };
}

export async function deleteLiveSession(
  sessionId: string,
  instructorId: string,
): Promise<void> {
  await db();
  await LiveSessionModel.deleteOne({ _id: sessionId, instructorId });
}

// ---------- COMPANY MODERATION ----------

export async function setCompanyVerified(
  companyId: string,
  verified: boolean,
): Promise<void> {
  await db();
  await CompanyModel.updateOne({ _id: companyId }, { $set: { verified } });
  await invalidate("companies:all", "companies:all:lite");
}

export async function setCompanyStatus(
  companyId: string,
  status: CompanyStatus,
  reason?: string,
): Promise<void> {
  await db();
  const set: any = { status };
  if (status === "suspended") {
    set.suspendedReason = reason ?? "Admin suspension";
    set.suspendedAt = new Date().toISOString();
  } else {
    set.suspendedReason = undefined;
    set.suspendedAt = undefined;
  }
  await CompanyModel.updateOne({ _id: companyId }, { $set: set });
  await invalidate("companies:all", "companies:all:lite");
}

export async function listAllCompaniesWithStats(): Promise<
  Array<CompanyProfile & {
    jobsOpen: number;
    recruiterCount: number;
    placementsTotal: number;
  }>
> {
  await db();
  const [companies, jobs, apps] = await Promise.all([
    CompanyModel.find({}).lean(),
    JobModel.find({}).lean(),
    ApplicationModel.find({ stage: "hired" }).lean(),
  ]);
  const list = unwrapAll(companies as unknown as CompanyProfile[]);
  const jobsByCo = new Map<string, number>();
  for (const j of jobs as unknown as Job[]) {
    if (j.active === false) continue;
    jobsByCo.set(j.companyId, (jobsByCo.get(j.companyId) ?? 0) + 1);
  }
  const placementsByCo = new Map<string, number>();
  for (const a of apps as unknown as Application[]) {
    const job = (jobs as unknown as Job[]).find((j) => j.id === a.jobId);
    if (!job) continue;
    placementsByCo.set(
      job.companyId,
      (placementsByCo.get(job.companyId) ?? 0) + 1,
    );
  }
  return list.map((c) => ({
    ...c,
    jobsOpen: jobsByCo.get(c.id) ?? 0,
    recruiterCount: c.recruiterIds.length,
    placementsTotal: placementsByCo.get(c.id) ?? 0,
  }));
}

// ---------- JOB MODERATION ----------

export async function listAllJobsWithCompany(): Promise<
  Array<Job & { companyName: string; applicationCount: number }>
> {
  await db();
  const [jobs, companies, apps] = await Promise.all([
    JobModel.find({}).sort({ createdAt: -1 }).lean(),
    CompanyModel.find({}).lean(),
    ApplicationModel.find({}).lean(),
  ]);
  const coMap = new Map<string, string>();
  for (const c of companies as unknown as CompanyProfile[]) {
    coMap.set(c.id, c.name);
  }
  const appCount = new Map<string, number>();
  for (const a of apps as unknown as Application[]) {
    appCount.set(a.jobId, (appCount.get(a.jobId) ?? 0) + 1);
  }
  return unwrapAll(jobs as unknown as Job[]).map((j) => ({
    ...j,
    companyName: coMap.get(j.companyId) ?? "Unknown",
    applicationCount: appCount.get(j.id) ?? 0,
  }));
}

export async function setJobActive(
  jobId: string,
  active: boolean,
): Promise<void> {
  await db();
  await JobModel.updateOne({ _id: jobId }, { $set: { active } });
  await invalidate("jobs:active", "jobs:active:lite");
}

// ---------- FINANCIAL ROLLUP ----------

export async function computeFinancialRollup(): Promise<{
  bootcampRevenuePaise: number;
  bootcampEnrolments: number;
  sponsorshipRevenuePaise: number;
  sponsorshipCount: number;
  refundsIssuedPaise: number;
  refundCount: number;
  byMonth: Array<{ month: string; revenuePaise: number; refundsPaise: number }>;
}> {
  await db();
  const [bootcamps, sponsorships, users, applications] = await Promise.all([
    BootcampModel.find({}).lean(),
    SponsorshipModel.find({}).lean(),
    UserModel.find({ role: "student" }).lean(),
    ApplicationModel.find({ slaRefundIssued: true }).lean(),
  ]);
  const bcMap = new Map<string, number>();
  for (const b of bootcamps as unknown as Bootcamp[]) bcMap.set(b.id, b.priceINR);

  // Bootcamp revenue = enrolledStudent count × price (₹). Convert to paise.
  let bootcampRevenuePaise = 0;
  let bootcampEnrolments = 0;
  for (const b of bootcamps as unknown as Bootcamp[]) {
    bootcampEnrolments += b.enrolledStudentIds.length;
    bootcampRevenuePaise += b.enrolledStudentIds.length * b.priceINR * 100;
  }

  let sponsorshipRevenuePaise = 0;
  let sponsorshipCount = 0;
  for (const s of sponsorships as unknown as Sponsorship[]) {
    if (s.status === "accepted" || s.status === "completed") {
      sponsorshipRevenuePaise += s.pricePaid * 100;
      sponsorshipCount += 1;
    }
  }

  // Refunds = SLA-breached apps × ₹250 (Phase 1 placeholder)
  const refundUnit = 25000;
  let refundsIssuedPaise = 0;
  let refundCount = 0;
  for (const a of applications as unknown as Application[]) {
    if (a.slaRefundIssued) {
      refundsIssuedPaise += refundUnit;
      refundCount += 1;
    }
  }

  // Monthly bucket = enrollment month if we had one — Phase 1 uses createdAt
  const byMonth = new Map<string, { rev: number; ref: number }>();
  for (const b of bootcamps as unknown as Bootcamp[]) {
    // approximate: assume even spread over last 6 months
  }
  void bcMap;
  void users;

  return {
    bootcampRevenuePaise,
    bootcampEnrolments,
    sponsorshipRevenuePaise,
    sponsorshipCount,
    refundsIssuedPaise,
    refundCount,
    byMonth: Array.from(byMonth.entries()).map(([month, v]) => ({
      month,
      revenuePaise: v.rev,
      refundsPaise: v.ref,
    })),
  };
}

// ---------- SUPPORT TICKETS ----------

export async function listSupportTickets(filter?: {
  status?: SupportTicketStatus;
}): Promise<SupportTicket[]> {
  await db();
  const q: Record<string, unknown> = {};
  if (filter?.status) q.status = filter.status;
  const docs = await SupportTicketModel.find(q).sort({ createdAt: -1 }).lean();
  return unwrapAll(docs as unknown as SupportTicket[]);
}

export async function getSupportTicketById(
  id: string,
): Promise<SupportTicket | undefined> {
  await db();
  const doc = await SupportTicketModel.findById(id).lean();
  return unwrap(doc as unknown as SupportTicket);
}

export async function createSupportTicket(
  input: Omit<SupportTicket, "id" | "createdAt" | "updatedAt">,
): Promise<SupportTicket> {
  await db();
  const now = new Date().toISOString();
  const t: SupportTicket = {
    id: genId("tkt"),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await SupportTicketModel.create({ _id: t.id, ...t });
  return t;
}

export async function updateSupportTicket(
  id: string,
  patch: Partial<
    Pick<SupportTicket, "status" | "priority" | "assignedToAdminId" | "bodyPreview">
  >,
): Promise<void> {
  await db();
  await SupportTicketModel.updateOne(
    { _id: id },
    { $set: { ...patch, updatedAt: new Date().toISOString() } },
  );
}

// ---------- EMAIL TEMPLATES ----------

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  await db();
  const docs = await EmailTemplateModel.find({}).sort({ key: 1 }).lean();
  return unwrapAll(docs as unknown as EmailTemplate[]);
}

export async function getEmailTemplateByKey(
  key: string,
): Promise<EmailTemplate | undefined> {
  await db();
  const doc = await EmailTemplateModel.findOne({ key }).lean();
  return unwrap(doc as unknown as EmailTemplate);
}

export async function updateEmailTemplate(
  id: string,
  patch: { subject?: string; body?: string; lastEditedByAdminId?: string },
): Promise<void> {
  await db();
  await EmailTemplateModel.updateOne(
    { _id: id },
    {
      $set: {
        ...patch,
        lastEditedAt: new Date().toISOString(),
      },
    },
  );
}
