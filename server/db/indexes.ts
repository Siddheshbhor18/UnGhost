/**
 * Compound index plan.
 *
 * Each entry is what a single `db.collection.createIndex()` call would
 * receive. Indexes are created idempotently by the matching migration in
 * `server/db/migrations/`. The EXPLAIN audit in CI walks this list and
 * confirms every documented query path has a backing index.
 *
 * Add a new index by:
 *   1. Append an entry here with the keys + reason
 *   2. Generate a migration: `npx tsx scripts/new-migration.ts <name>`
 *   3. Migration body calls `await db.collection(...).createIndex({ ... }, { ... })`
 *   4. Run `npm run migrate:up` in dev to verify
 */

export interface IndexSpec {
  collection: string;
  keys: Record<string, 1 | -1>;
  options?: {
    name?: string;
    unique?: boolean;
    sparse?: boolean;
    partialFilterExpression?: Record<string, unknown>;
  };
  /** Plain-English description of the query path this index serves. */
  reason: string;
}

export const INDEXES: IndexSpec[] = [
  // ── Applications ───────────────────────────────────────────────────────
  {
    collection: "applications",
    keys: { studentId: 1, stage: 1 },
    options: { name: "ix_applications_studentId_stage" },
    reason: "Dashboard 'Active Missions' rail loads per-student per-stage counts.",
  },
  {
    collection: "applications",
    keys: { jobId: 1, stage: 1 },
    options: { name: "ix_applications_jobId_stage" },
    reason: "Recruiter pipeline groups applicants per stage per job.",
  },
  {
    collection: "applications",
    keys: { recruiterId: 1, createdAt: -1 },
    options: { name: "ix_applications_recruiterId_createdAt" },
    reason: "Recruiter Today shows newest applications first.",
  },
  {
    collection: "applications",
    keys: { slaRefundIssued: 1, createdAt: -1 },
    options: {
      name: "ix_applications_refundIssued_recent",
      partialFilterExpression: { slaRefundIssued: true },
    },
    reason: "Telemetry queries 'recent SLA breaches' for the admin alert sweep.",
  },

  // ── Jobs ───────────────────────────────────────────────────────────────
  {
    collection: "jobs",
    keys: { companyId: 1, active: 1 },
    options: { name: "ix_jobs_companyId_active" },
    reason: "Company profile pages list active jobs; admin moderation queries by status.",
  },
  {
    collection: "jobs",
    keys: { recruiterId: 1, createdAt: -1 },
    options: { name: "ix_jobs_recruiterId_createdAt" },
    reason: "Recruiter command centre lists my jobs newest-first.",
  },
  {
    collection: "jobs",
    keys: { active: 1, createdAt: -1 },
    options: { name: "ix_jobs_active_createdAt" },
    reason: "Public mission feed shows newest active jobs.",
  },

  // ── Users ──────────────────────────────────────────────────────────────
  {
    collection: "users",
    keys: { email: 1 },
    options: { name: "ix_users_email", unique: true },
    reason: "Auth lookups by email — must be unique to prevent duplicate accounts.",
  },
  {
    collection: "users",
    keys: { role: 1, status: 1 },
    options: { name: "ix_users_role_status" },
    reason: "Admin student/recruiter lists filter by status.",
  },
  {
    collection: "users",
    keys: { companyId: 1, role: 1 },
    options: {
      name: "ix_users_companyId_role",
      partialFilterExpression: { companyId: { $type: "string" } },
    },
    reason: "Company team page lists recruiters per company.",
  },

  // ── Companies ──────────────────────────────────────────────────────────
  {
    collection: "companies",
    keys: { status: 1, name: 1 },
    options: { name: "ix_companies_status_name" },
    reason: "Admin companies list filters by status, sorts alphabetically.",
  },
  {
    collection: "companies",
    keys: { verified: 1 },
    options: { name: "ix_companies_verified", sparse: true },
    reason: "Verified-only feeds (search filter, landing page badges).",
  },

  // ── Bootcamps ──────────────────────────────────────────────────────────
  {
    collection: "bootcamps",
    keys: { instructorId: 1, status: 1 },
    options: { name: "ix_bootcamps_instructorId_status" },
    reason: "Instructor studio dashboard lists own bootcamps by status.",
  },
  {
    collection: "bootcamps",
    keys: { status: 1, category: 1 },
    options: { name: "ix_bootcamps_status_category" },
    reason: "Public catalogue filters published bootcamps by category.",
  },

  // ── Live sessions ──────────────────────────────────────────────────────
  {
    collection: "livesessions",
    keys: { bootcampId: 1, status: 1, startsAt: 1 },
    options: { name: "ix_live_bootcamp_status_starts" },
    reason: "Student lobby lists upcoming sessions for enrolled bootcamps.",
  },
  {
    collection: "livesessions",
    keys: { instructorId: 1, startsAt: -1 },
    options: { name: "ix_live_instructor_starts" },
    reason: "Instructor live page lists own sessions newest-first.",
  },
  {
    collection: "livesessions",
    keys: { roomCode: 1 },
    options: { name: "ix_live_roomCode", unique: true },
    reason: "/live/[code] route does direct room-code lookup.",
  },

  // ── AI coach + notifications ───────────────────────────────────────────
  {
    collection: "aicoachconversations",
    keys: { studentId: 1, updatedAt: -1 },
    options: { name: "ix_coach_studentId_updatedAt" },
    reason: "Coach sidebar lists recent conversations newest-first.",
  },
  {
    collection: "notifications",
    keys: { userId: 1, readAt: 1, createdAt: -1 },
    options: { name: "ix_notif_user_unread_recent" },
    reason: "Notification bell shows unread first, newest among them.",
  },

  // ── Audit + moderation ─────────────────────────────────────────────────
  {
    collection: "auditlogs",
    keys: { actorId: 1, createdAt: -1 },
    options: { name: "ix_audit_actor_recent" },
    reason: "Admin audit page filters by actor.",
  },
  {
    collection: "auditlogs",
    keys: { targetType: 1, targetId: 1 },
    options: { name: "ix_audit_target" },
    reason: "Show history for a specific company/job/user.",
  },
  {
    collection: "moderationflags",
    keys: { status: 1, createdAt: -1 },
    options: { name: "ix_modflag_status_recent" },
    reason: "Moderation queue lists open flags newest-first.",
  },

  // ── Support + email templates ──────────────────────────────────────────
  {
    collection: "supporttickets",
    keys: { status: 1, priority: 1, createdAt: -1 },
    options: { name: "ix_tickets_status_priority_recent" },
    reason: "Admin support split-pane filters by status sorted by priority+time.",
  },
  {
    collection: "emailtemplates",
    keys: { key: 1 },
    options: { name: "ix_emailtpl_key", unique: true },
    reason: "Render-time template lookups by stable code (e.g. password_reset).",
  },

  // ── Creator platform ───────────────────────────────────────────────────
  {
    collection: "creatorprofiles",
    keys: { referralCode: 1 },
    options: { name: "ux_creator_referralCode", unique: true },
    reason: "Public /r/[code] entry resolves a creator by their unique code.",
  },
  {
    collection: "commissionagreements",
    keys: { creatorId: 1, status: 1 },
    options: {
      name: "ux_commission_one_active_per_creator",
      unique: true,
      partialFilterExpression: { status: "active" },
    },
    reason: "At most one active agreement per creator; reads of the active rate.",
  },
  {
    collection: "referralsessions",
    keys: { sessionToken: 1 },
    options: { name: "ux_referral_sessionToken", unique: true },
    reason: "Signup attribution resolves the session from the ug_ref cookie.",
  },
  {
    collection: "referralsessions",
    keys: { status: 1, expiresAt: 1 },
    options: { name: "ix_referral_status_expiry" },
    reason: "Daily sweep cron scans active sessions past expiresAt.",
  },
  {
    collection: "creatorrewards",
    keys: { paymentId: 1 },
    options: { name: "ux_reward_paymentId", unique: true },
    reason: "One reward per payment — idempotent reward creation (§9.7).",
  },
  {
    collection: "creatorrewards",
    keys: { status: 1, createdAt: -1 },
    options: { name: "ix_reward_status_recent" },
    reason: "Admin reward queue filters by status, newest first.",
  },
  {
    collection: "creditledgers",
    keys: { creatorId: 1, createdAt: -1 },
    options: { name: "ix_ledger_creator_recent" },
    reason: "Balance aggregation + ledger history scoped to one creator.",
  },
  {
    collection: "payoutrequests",
    keys: { status: 1, requestedAt: -1 },
    options: { name: "ix_payout_status_recent" },
    reason: "Admin payout queue filters by status, oldest-requested first.",
  },
  {
    collection: "creatorevents",
    keys: { entityType: 1, entityId: 1, createdAt: -1 },
    options: { name: "ix_creator_events_entity_recent" },
    reason: "Timeline view of one entity's audit events, newest first.",
  },
];
