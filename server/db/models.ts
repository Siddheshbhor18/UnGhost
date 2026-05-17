import mongoose, { Schema, Model } from "mongoose";
import type {
  AICoachConversation,
  LiveSession,
  AppNotification,
  Application,
  AuditLog,
  Bootcamp,
  Campaign,
  CompanyProfile,
  EmailTemplate,
  InMail,
  Job,
  JobTemplate,
  Message,
  MessageThread,
  ModerationFlag,
  NotInterestedFeedback,
  SavedJob,
  SavedSearch,
  Sponsorship,
  SupportTicket,
  User,
} from "@/shared/types";

/**
 * NOTE: We use the domain `id` (string) as Mongoose's `_id`.
 * `toJSON` is configured to strip `__v` and expose `id` as the canonical key.
 */
const stringIdOpts = {
  _id: false as const,
  versionKey: false,
};

function withJsonTransform<T extends Schema>(s: T): T {
  s.set("toJSON", {
    virtuals: false,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.__v;
      return ret;
    },
  });
  return s;
}

// ---------- User ----------
const HistoryEntrySchema = new Schema(
  {
    id: String,
    title: String,
    company: String,
    startDate: String,
    endDate: String,
    impact: String,
  },
  { _id: false },
);

const BootcampProgressSchema = new Schema(
  {
    bootcampId: String,
    videosWatched: [String],
    skillChecksPassed: [String],
    skillCheckAttempts: { type: Schema.Types.Mixed, default: {} },
    notes: { type: Schema.Types.Mixed, default: {} },
    liveAttended: { type: Boolean, default: false },
    liveAttendancePct: Number,
    assignment: { type: Schema.Types.Mixed },
    verifiedBadgeIssued: { type: Boolean, default: false },
  },
  { _id: false },
);

const StudentProfileSchema = new Schema(
  {
    alias: String,
    contactEmail: String,
    contactPhone: String,
    trajectory: String,
    skills: [String],
    verifiedSkills: [String],
    enrolledBootcamps: [String],
    history: [HistoryEntrySchema],
    resumeUrl: String,
    joinedAt: String,
    lastActiveAt: String,
    city: String,
    remotePref: String,
    searchVisibility: { type: Boolean, default: true },
    applicationIdentity: { type: String, default: "named" },
    yearsExperience: Number,
    bootcampProgress: { type: [BootcampProgressSchema], default: [] },
  },
  { _id: false },
);

const UserSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      email: { type: String, required: true, unique: true, index: true },
      passwordHash: String,
      role: { type: String, required: true, index: true },
      name: String,
      avatarUrl: String,
      profile: StudentProfileSchema,
      companyId: String,
      /** Recruiter only: InMail credit balance. Phase 1 free InMail = 50 default. */
      inMailCredits: { type: Number, default: 50 },
      isCompanyAdmin: { type: Boolean, default: false },
      status: { type: String, default: "active", index: true },
      suspendedUntil: String,
      suspendedReason: String,
      suspendedAt: String,
      suspendedByAdminId: String,
      coachPersona: { type: String, default: "balanced" },
      aiCoachMemory: {
        type: new Schema(
          {
            summary: String,
            facts: [String],
            updatedAt: String,
          },
          { _id: false },
        ),
        default: undefined,
      },
    },
    { versionKey: false },
  ),
);

// ---------- Company ----------
const CompanySchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      name: String,
      logoUrl: String,
      domain: String,
      description: String,
      recruiterIds: [String],
      verified: { type: Boolean, default: false },
      status: { type: String, default: "active", index: true },
      suspendedReason: String,
      suspendedAt: String,
    },
    { versionKey: false },
  ),
);

// ---------- Job ----------
const JobSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      companyId: { type: String, index: true },
      recruiterId: { type: String, index: true },
      title: String,
      skills: [String],
      location: String,
      remote: String,
      slaHours: Number,
      gauntletPrompt: String,
      description: String,
      salaryMin: Number,
      salaryMax: Number,
      createdAt: String,
      active: { type: Boolean, default: true },
    },
    { versionKey: false },
  ),
);

// ---------- Application ----------
const AssessmentGradeSchema = new Schema(
  {
    score: Number,
    notes: String,
    verdict: String,
    depthSignal: Number,
  },
  { _id: false },
);

const AssessmentSubmissionSchema = new Schema(
  {
    prompt: String,
    response: String,
    submittedAt: String,
    grade: AssessmentGradeSchema,
  },
  { _id: false },
);

const ApplicationSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      jobId: { type: String, index: true },
      studentId: { type: String, index: true },
      stage: { type: String, index: true },
      matchPct: Number,
      assessment: AssessmentSubmissionSchema,
      createdAt: String,
      slaDeadline: String,
      interviewScheduledAt: String,
      outcomeNotes: String,
      withdrawnAt: String,
      updateRequestedAt: String,
      slaBreachedAt: String,
      slaRefundIssued: Boolean,
    },
    { versionKey: false },
  ),
);

// ---------- Bootcamp ----------
const BootcampVideoSchema = new Schema(
  {
    id: String,
    title: String,
    durationMin: Number,
    posterUrl: String,
    verifyPrompt: String,
  },
  { _id: false },
);

const BootcampSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      skill: String,
      category: { type: String, index: true },
      title: String,
      description: String,
      priceINR: Number,
      durationWeeks: Number,
      instructorId: String,
      videos: [BootcampVideoSchema],
      liveSlots: [String],
      enrolledStudentIds: [String],
      rating: Number,
      coverColor: String,
      status: { type: String, index: true, default: "published" },
      submittedForReviewAt: String,
      reviewFeedback: String,
    },
    { versionKey: false },
  ),
);

// ---------- Campaign ----------
const CampaignSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      name: String,
      placement: String,
      mediaUrl: String,
      headline: String,
      subtext: String,
      targetUrl: String,
      status: String,
      createdAt: String,
    },
    { versionKey: false },
  ),
);

// Use mongoose.models guard so HMR doesn't error on recompile
export const UserModel: Model<User> =
  (mongoose.models.User as Model<User>) ||
  mongoose.model<User>("User", UserSchema);

export const CompanyModel: Model<CompanyProfile> =
  (mongoose.models.Company as Model<CompanyProfile>) ||
  mongoose.model<CompanyProfile>("Company", CompanySchema);

export const JobModel: Model<Job> =
  (mongoose.models.Job as Model<Job>) ||
  mongoose.model<Job>("Job", JobSchema);

export const ApplicationModel: Model<Application> =
  (mongoose.models.Application as Model<Application>) ||
  mongoose.model<Application>("Application", ApplicationSchema);

export const BootcampModel: Model<Bootcamp> =
  (mongoose.models.Bootcamp as Model<Bootcamp>) ||
  mongoose.model<Bootcamp>("Bootcamp", BootcampSchema);

export const CampaignModel: Model<Campaign> =
  (mongoose.models.Campaign as Model<Campaign>) ||
  mongoose.model<Campaign>("Campaign", CampaignSchema);

// ---------- Sponsorship ----------
const SponsorshipSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      recruiterId: { type: String, index: true },
      companyName: String,
      studentId: { type: String, index: true },
      bootcampId: { type: String, index: true },
      jobId: String,
      pricePaid: Number,
      status: { type: String, index: true },
      offeredAt: String,
      acceptedAt: String,
      declinedAt: String,
      expiresAt: String,
      completedAt: String,
      paymentRef: String,
    },
    { versionKey: false },
  ),
);

export const SponsorshipModel: Model<Sponsorship> =
  (mongoose.models.Sponsorship as Model<Sponsorship>) ||
  mongoose.model<Sponsorship>("Sponsorship", SponsorshipSchema);

// ---------- InMail ----------
const InMailSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      recruiterId: { type: String, index: true },
      recruiterName: String,
      companyName: String,
      studentId: { type: String, index: true },
      jobId: String,
      jobTitle: String,
      subject: String,
      body: String,
      sentAt: String,
      status: { type: String, index: true },
      respondedAt: String,
      refundDeadline: String,
    },
    { versionKey: false },
  ),
);

export const InMailModel: Model<InMail> =
  (mongoose.models.InMail as Model<InMail>) ||
  mongoose.model<InMail>("InMail", InMailSchema);

// ---------- Notifications ----------
const NotificationSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      userId: { type: String, index: true },
      kind: { type: String, index: true },
      priority: String,
      title: String,
      body: String,
      link: String,
      actorLabel: String,
      actionRequired: Boolean,
      createdAt: { type: String, index: true },
      readAt: String,
    },
    { versionKey: false },
  ),
);

export const NotificationModel: Model<AppNotification> =
  (mongoose.models.AppNotification as Model<AppNotification>) ||
  mongoose.model<AppNotification>("AppNotification", NotificationSchema);

// ---------- Message Threads + Messages ----------
const MessageThreadSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      context: { type: Schema.Types.Mixed },
      recruiterId: { type: String, index: true },
      studentId: { type: String, index: true },
      companyName: String,
      jobTitle: String,
      createdAt: String,
      lastMessageAt: { type: String, index: true },
      lastPreview: String,
      unreadForRecruiter: { type: Number, default: 0 },
      unreadForStudent: { type: Number, default: 0 },
    },
    { versionKey: false },
  ),
);

const MessageSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      threadId: { type: String, index: true },
      senderId: String,
      senderRole: String,
      body: String,
      createdAt: { type: String, index: true },
      readBy: { type: [String], default: [] },
    },
    { versionKey: false },
  ),
);

export const MessageThreadModel: Model<MessageThread> =
  (mongoose.models.MessageThread as Model<MessageThread>) ||
  mongoose.model<MessageThread>("MessageThread", MessageThreadSchema);

export const MessageModel: Model<Message> =
  (mongoose.models.Message as Model<Message>) ||
  mongoose.model<Message>("Message", MessageSchema);

// ---------- Saved Jobs + Not Interested ----------
const SavedJobSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      studentId: { type: String, index: true },
      jobId: { type: String, index: true },
      savedAt: String,
    },
    { versionKey: false },
  ),
);
SavedJobSchema.index({ studentId: 1, jobId: 1 }, { unique: true });

const NotInterestedSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      studentId: { type: String, index: true },
      jobId: { type: String, index: true },
      dismissedAt: String,
      reason: String,
    },
    { versionKey: false },
  ),
);
NotInterestedSchema.index({ studentId: 1, jobId: 1 }, { unique: true });

export const SavedJobModel: Model<SavedJob> =
  (mongoose.models.SavedJob as Model<SavedJob>) ||
  mongoose.model<SavedJob>("SavedJob", SavedJobSchema);

export const NotInterestedModel: Model<NotInterestedFeedback> =
  (mongoose.models.NotInterestedFeedback as Model<NotInterestedFeedback>) ||
  mongoose.model<NotInterestedFeedback>(
    "NotInterestedFeedback",
    NotInterestedSchema,
  );

// ---------- Audit Log (immutable, 7-year retention per PRD) ----------
const AuditLogSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      actorId: { type: String, index: true },
      actorRole: { type: String, index: true },
      action: { type: String, index: true },
      targetType: { type: String, index: true },
      targetId: { type: String, index: true },
      summary: String,
      before: Schema.Types.Mixed,
      after: Schema.Types.Mixed,
      reason: String,
      createdAt: { type: String, index: true },
      meta: Schema.Types.Mixed,
    },
    { versionKey: false },
  ),
);

// ---------- Moderation flags ----------
const ModerationFlagSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      kind: { type: String, index: true },
      targetId: { type: String, index: true },
      targetLabel: String,
      contentExcerpt: String,
      aiConfidence: Number,
      reasons: [String],
      reportedBy: String,
      decision: { type: String, index: true, default: "pending" },
      decidedAt: String,
      decidedBy: String,
      decisionNote: String,
      createdAt: { type: String, index: true },
    },
    { versionKey: false },
  ),
);

export const AuditLogModel: Model<AuditLog> =
  (mongoose.models.AuditLog as Model<AuditLog>) ||
  mongoose.model<AuditLog>("AuditLog", AuditLogSchema);

export const ModerationFlagModel: Model<ModerationFlag> =
  (mongoose.models.ModerationFlag as Model<ModerationFlag>) ||
  mongoose.model<ModerationFlag>("ModerationFlag", ModerationFlagSchema);

// ---------- Saved searches + Job templates ----------
const SavedSearchSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      recruiterId: { type: String, index: true },
      name: String,
      filtersJson: String,
      alertFrequency: String,
      lastRunAt: String,
      createdAt: { type: String, index: true },
    },
    { versionKey: false },
  ),
);

const JobTemplateSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      recruiterId: { type: String, index: true },
      isCompanyShared: { type: Boolean, default: false },
      companyId: { type: String, index: true },
      name: String,
      title: String,
      skills: [String],
      gauntletPrompt: String,
      description: String,
      salaryMin: Number,
      salaryMax: Number,
      remote: String,
      slaHours: Number,
      location: String,
      createdAt: { type: String, index: true },
    },
    { versionKey: false },
  ),
);

// ---------- AI Coach conversations ----------
const AICoachConversationSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      studentId: { type: String, index: true },
      title: String,
      preview: String,
      messages: [
        new Schema(
          { role: String, content: String, ts: String },
          { _id: false },
        ),
      ],
      createdAt: { type: String, index: true },
      updatedAt: { type: String, index: true },
    },
    { versionKey: false },
  ),
);

export const AICoachConversationModel: Model<AICoachConversation> =
  (mongoose.models.AICoachConversation as Model<AICoachConversation>) ||
  mongoose.model<AICoachConversation>(
    "AICoachConversation",
    AICoachConversationSchema,
  );

// ---------- Live sessions ----------
const LiveSessionSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      bootcampId: { type: String, index: true },
      instructorId: { type: String, index: true },
      title: String,
      description: String,
      startsAt: { type: String, index: true },
      durationMin: Number,
      status: { type: String, default: "scheduled", index: true },
      roomCode: { type: String, unique: true, index: true },
      registeredStudentIds: [String],
      attendedStudentIds: [String],
      createdAt: { type: String, index: true },
      startedAt: String,
      endedAt: String,
      recordingUrl: String,
      videoRoomId: String,
      videoProvider: String,
    },
    { versionKey: false },
  ),
);

export const LiveSessionModel: Model<LiveSession> =
  (mongoose.models.LiveSession as Model<LiveSession>) ||
  mongoose.model<LiveSession>("LiveSession", LiveSessionSchema);

export const SavedSearchModel: Model<SavedSearch> =
  (mongoose.models.SavedSearch as Model<SavedSearch>) ||
  mongoose.model<SavedSearch>("SavedSearch", SavedSearchSchema);

export const JobTemplateModel: Model<JobTemplate> =
  (mongoose.models.JobTemplate as Model<JobTemplate>) ||
  mongoose.model<JobTemplate>("JobTemplate", JobTemplateSchema);

// ---------- Support tickets ----------
const SupportTicketSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      subject: String,
      category: { type: String, index: true },
      status: { type: String, default: "open", index: true },
      priority: { type: String, default: "normal", index: true },
      requesterEmail: { type: String, index: true },
      requesterRole: String,
      bodyPreview: String,
      createdAt: { type: String, index: true },
      updatedAt: { type: String, index: true },
      assignedToAdminId: { type: String, index: true },
    },
    { versionKey: false },
  ),
);

export const SupportTicketModel: Model<SupportTicket> =
  (mongoose.models.SupportTicket as Model<SupportTicket>) ||
  mongoose.model<SupportTicket>("SupportTicket", SupportTicketSchema);

// ---------- Email templates ----------
const EmailTemplateSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      key: { type: String, unique: true, index: true },
      name: String,
      subject: String,
      body: String,
      variables: [String],
      lastEditedAt: { type: String, index: true },
      lastEditedByAdminId: { type: String, index: true },
    },
    { versionKey: false },
  ),
);

export const EmailTemplateModel: Model<EmailTemplate> =
  (mongoose.models.EmailTemplate as Model<EmailTemplate>) ||
  mongoose.model<EmailTemplate>("EmailTemplate", EmailTemplateSchema);

/**
 * Strip mongo's `_id` and shape doc back to domain object with `id`.
 */
export function unwrap<T extends { _id?: string; id?: string }>(
  doc: T | null,
): T | undefined {
  if (!doc) return undefined;
  const obj: any =
    typeof (doc as any).toObject === "function"
      ? (doc as any).toObject()
      : { ...doc };
  if (obj._id && !obj.id) obj.id = obj._id;
  delete obj._id;
  return obj as T;
}

export function unwrapAll<T extends { _id?: string; id?: string }>(
  docs: T[],
): T[] {
  return docs.map((d) => unwrap(d)!).filter(Boolean);
}

// Avoid unused-import warning if domain types tree-shake
void stringIdOpts;
