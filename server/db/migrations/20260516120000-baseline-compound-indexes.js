/**
 * Baseline compound index plan.
 *
 * Idempotent — skips an index if one with the same keys already exists
 * under any name (Mongoose auto-creates some via `{ unique: true }` in
 * the schema, e.g. users.email).
 */
const INDEXES = [
  ["applications", { studentId: 1, stage: 1 }, { name: "ix_applications_studentId_stage" }],
  ["applications", { jobId: 1, stage: 1 }, { name: "ix_applications_jobId_stage" }],
  ["applications", { recruiterId: 1, createdAt: -1 }, { name: "ix_applications_recruiterId_createdAt" }],
  ["applications", { slaRefundIssued: 1, createdAt: -1 }, {
    name: "ix_applications_refundIssued_recent",
    partialFilterExpression: { slaRefundIssued: true },
  }],

  ["jobs", { companyId: 1, active: 1 }, { name: "ix_jobs_companyId_active" }],
  ["jobs", { recruiterId: 1, createdAt: -1 }, { name: "ix_jobs_recruiterId_createdAt" }],
  ["jobs", { active: 1, createdAt: -1 }, { name: "ix_jobs_active_createdAt" }],

  ["users", { email: 1 }, { name: "ix_users_email", unique: true }],
  ["users", { role: 1, status: 1 }, { name: "ix_users_role_status" }],
  ["users", { companyId: 1, role: 1 }, {
    name: "ix_users_companyId_role",
    partialFilterExpression: { companyId: { $type: "string" } },
  }],

  ["companies", { status: 1, name: 1 }, { name: "ix_companies_status_name" }],
  ["companies", { verified: 1 }, { name: "ix_companies_verified", sparse: true }],

  ["bootcamps", { instructorId: 1, status: 1 }, { name: "ix_bootcamps_instructorId_status" }],
  ["bootcamps", { status: 1, category: 1 }, { name: "ix_bootcamps_status_category" }],

  ["livesessions", { bootcampId: 1, status: 1, startsAt: 1 }, { name: "ix_live_bootcamp_status_starts" }],
  ["livesessions", { instructorId: 1, startsAt: -1 }, { name: "ix_live_instructor_starts" }],
  ["livesessions", { roomCode: 1 }, { name: "ix_live_roomCode", unique: true }],

  ["aicoachconversations", { studentId: 1, updatedAt: -1 }, { name: "ix_coach_studentId_updatedAt" }],
  ["notifications", { userId: 1, readAt: 1, createdAt: -1 }, { name: "ix_notif_user_unread_recent" }],

  ["auditlogs", { actorId: 1, createdAt: -1 }, { name: "ix_audit_actor_recent" }],
  ["auditlogs", { targetType: 1, targetId: 1 }, { name: "ix_audit_target" }],
  ["moderationflags", { status: 1, createdAt: -1 }, { name: "ix_modflag_status_recent" }],

  ["supporttickets", { status: 1, priority: 1, createdAt: -1 }, { name: "ix_tickets_status_priority_recent" }],
  ["emailtemplates", { key: 1 }, { name: "ix_emailtpl_key", unique: true }],
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
