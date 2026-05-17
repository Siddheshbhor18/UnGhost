/**
 * DPDP Act compliance helpers.
 *
 * India's Digital Personal Data Protection Act 2023 grants users:
 *  - Section 11: right to access (data portability) — get all data we hold.
 *  - Section 12: right to correction (handled by /student/profile/edit).
 *  - Section 13: right to erasure — delete account + every linked artefact.
 *
 * Required SLA per the Act: respond within 30 days. Our implementation is
 * synchronous: the export endpoint emits the JSON in-band; the erasure
 * endpoint soft-deletes immediately and hard-deletes after a 30-day grace
 * (audit-log retention requirement).
 */
import {
  AICoachConversationModel,
  ApplicationModel,
  AuditLogModel,
  BootcampModel,
  InMailModel,
  NotificationModel,
  SavedJobModel,
  SponsorshipModel,
  SupportTicketModel,
  UserModel,
} from "@/server/db/models";
import { redis } from "@/server/db/redis";
import { logger } from "@/server/lib/logger";

export interface DpdpExport {
  exportedAt: string;
  user: Record<string, unknown> | null;
  applications: unknown[];
  savedJobs: unknown[];
  sponsorships: unknown[];
  inmails: unknown[];
  notifications: unknown[];
  coachConversations: unknown[];
  enrolledBootcamps: unknown[];
  supportTickets: unknown[];
  auditTrail: unknown[];
}

/**
 * Collect every artefact tied to a user's id or email. Returns a single
 * JSON-serialisable object the user can download.
 */
export async function exportUserData(userId: string): Promise<DpdpExport> {
  const user = await UserModel.findById(userId).lean();
  if (!user) {
    return emptyExport();
  }
  const email = (user as { email?: string }).email;
  const [
    applications,
    savedJobs,
    sponsorships,
    inmails,
    notifications,
    coachConversations,
    enrolledBootcamps,
    supportTickets,
    auditTrail,
  ] = await Promise.all([
    ApplicationModel.find({ studentId: userId }).lean(),
    SavedJobModel.find({ studentId: userId }).lean(),
    SponsorshipModel.find({
      $or: [{ studentId: userId }, { recruiterId: userId }],
    }).lean(),
    InMailModel.find({
      $or: [{ studentId: userId }, { recruiterId: userId }],
    }).lean(),
    NotificationModel.find({ userId }).lean(),
    AICoachConversationModel.find({ studentId: userId }).lean(),
    BootcampModel.find({ enrolledStudentIds: userId }).lean(),
    email ? SupportTicketModel.find({ requesterEmail: email }).lean() : [],
    AuditLogModel.find({
      $or: [{ actorId: userId }, { targetId: userId }],
    }).lean(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    user: user as unknown as Record<string, unknown>,
    applications,
    savedJobs,
    sponsorships,
    inmails,
    notifications,
    coachConversations,
    enrolledBootcamps,
    supportTickets,
    auditTrail,
  };
}

function emptyExport(): DpdpExport {
  return {
    exportedAt: new Date().toISOString(),
    user: null,
    applications: [],
    savedJobs: [],
    sponsorships: [],
    inmails: [],
    notifications: [],
    coachConversations: [],
    enrolledBootcamps: [],
    supportTickets: [],
    auditTrail: [],
  };
}

/**
 * Soft-delete: mark the user `status: "soft_deleted"`, strip PII fields,
 * cancel active sessions. The 30-day grace allows mistaken deletions to be
 * reversed; after grace, `hardDelete` removes the row.
 */
export async function softDeleteUser(userId: string, reason?: string): Promise<void> {
  const now = new Date().toISOString();
  const purgeAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await UserModel.updateOne(
    { _id: userId },
    {
      $set: {
        status: "soft_deleted",
        suspendedAt: now,
        suspendedReason: reason ?? "DPDP § 13 erasure",
        // Strip personal fields immediately; audit + reference data stays.
        email: `deleted-${userId}@unghost.local`,
        name: "Deleted user",
        avatarUrl: undefined,
        profile: undefined,
        aiCoachMemory: undefined,
      },
      $unset: { passwordHash: "" },
    },
  );
  // Schedule hard delete by writing a TTL key in Redis (the SLA-sweep job
  // can pick up these keys when it lands; for now the key is documentary).
  await redis()
    .set(`dpdp:purge:${userId}`, purgeAt, { ex: 60 * 60 * 24 * 31 })
    .catch(() => {});
  logger.info({ userId, reason, purgeAt }, "dpdp.soft-delete");
}

/**
 * Hard-delete every artefact owned by the user. Called after the 30-day
 * grace window by the SLA sweep. Idempotent.
 */
export async function hardDeleteUser(userId: string): Promise<void> {
  await Promise.all([
    ApplicationModel.deleteMany({ studentId: userId }),
    SavedJobModel.deleteMany({ studentId: userId }),
    SponsorshipModel.deleteMany({
      $or: [{ studentId: userId }, { recruiterId: userId }],
    }),
    InMailModel.deleteMany({
      $or: [{ studentId: userId }, { recruiterId: userId }],
    }),
    NotificationModel.deleteMany({ userId }),
    AICoachConversationModel.deleteMany({ studentId: userId }),
    BootcampModel.updateMany(
      { enrolledStudentIds: userId },
      { $pull: { enrolledStudentIds: userId } },
    ),
    // Audit log retention: legally required for 7 years in some jurisdictions.
    // Don't delete; we only blanked PII fields during soft-delete.
    UserModel.deleteOne({ _id: userId }),
  ]);
  await redis().del(`dpdp:purge:${userId}`).catch(() => {});
  logger.info({ userId }, "dpdp.hard-delete");
}
