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
      // ── Subscription ──────────────────────────────────────────────
      plan: { type: String, default: "free", index: true },
      planType: { type: String, default: "free" },
      planActivatedAt: String,
      planExpiresAt: { type: String, index: true },
      lastBillingTxnId: String,
      // When true, the daily expiry cron does NOT renew Pro at planExpiresAt.
      planRenewalCancelled: { type: Boolean, default: false },
      // ── Verification ──────────────────────────────────────────────
      // Defaults false. /api/auth/signup flips it only after the user
      // proves email ownership. Login refuses if still false (with a
      // "resend verification" path).
      emailVerified: { type: Boolean, default: false, index: true },
      emailVerifiedAt: String,
      createdAt: String,
      // ── Channel-partner attribution ──────────────────────────────
      referrerPartnerId: { type: String, index: true },
      referrerCapturedAt: String,
      // ── OAuth provenance ─────────────────────────────────────────
      // Set to "google" | "linkedin" the first time a user signs in via
      // that provider. Null/absent for credentials-only signups. Read-only
      // hint for admin UI — auth decisions are still driven by Mongo
      // presence + role, not this field.
      oauthProvider: { type: String, default: null },
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
    // Playback URL. Direct file (R2/S3 .mp4/.m3u8) OR a YouTube watch/share
    // URL. The student-side player auto-picks: YouTube embeds in an iframe,
    // direct URLs go through HTML5 <video>. Stays null until the instructor
    // pastes a source.
    url: { type: String, default: null },
  },
  { _id: false },
);

// One live session inside a bootcamp. Created at scheduling time; `meetUrl`
// + `calendarEventId` are populated later by the daily Vercel cron that
// provisions tomorrow's Google Meet events. `recordingUrl` stays null on
// free Google Workspace tiers — instructor pastes a YouTube/Drive/R2 link
// via the admin "Upload recording" form after the session ends.
const BootcampSessionSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: String,
    scheduledFor: { type: Date, default: null },
    durationMinutes: { type: Number, default: 90 },
    meetUrl: { type: String, default: null },
    calendarEventId: { type: String, default: null },
    recordingUrl: { type: String, default: null },
  },
  { _id: true },
);

const BootcampSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      skill: String,
      category: { type: String, index: true },
      title: String,
      description: String,
      // Legacy rupee price kept for backwards-compat reads. priceInPaise
      // is authoritative — all calc + display goes through computeTotalPaise().
      priceINR: Number,
      priceInPaise: { type: Number, default: 0 },
      // GST rate applied on top of the base price at checkout. Default 18%
      // matches Indian SaaS / education standard rate.
      gstPercent: { type: Number, default: 18 },
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
      // ── Enrollment window + capacity (added by qr-payments-and-meet plan) ──
      enrollmentOpensAt: { type: Date, default: null },
      enrollmentClosesAt: { type: Date, default: null },
      startsAt: { type: Date, default: null },
      endsAt: { type: Date, default: null },
      // Google Meet caps per-event attendees at 500 — reserve 5 for staff
      // so default ceiling is 495. Per-bootcamp override allowed.
      maxStudents: { type: Number, default: 495 },
      // Atomic counter incremented by /api/enrollments POST inside a
      // findOneAndUpdate guard (count < maxStudents). Decremented on
      // admin reject so a rejected slot frees up. Approval keeps it counted.
      currentSubmissionCount: { type: Number, default: 0 },
      sessions: { type: [BootcampSessionSchema], default: [] },
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

// ─────────────────────────────────────────────────────────────────────────
//  PaymentSubmission
//  A student-submitted record claiming they've paid for a bootcamp via
//  the static merchant QR. Admin manually verifies the UTR against the
//  PhonePe merchant portal before flipping status to `approved`.
//
//  Why a partial unique index, not a hard one:
//    A student may legitimately resubmit a different UTR after their
//    first submission was rejected (e.g. typo). The partial filter on
//    {status ∈ pending_verification, approved} blocks duplicate active
//    submissions while leaving rejected ones alone.
//
//  Why `expectedAmountInPaise` is denormalised onto the submission:
//    Bootcamp price changes (rare but possible) shouldn't retroactively
//    flag old submissions as wrong-amount. Lock the expected total at
//    submission time.
// ─────────────────────────────────────────────────────────────────────────
const PaymentSubmissionSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      userId: { type: String, required: true, index: true },
      bootcampId: { type: String, required: true, index: true },
      expectedAmountInPaise: { type: Number, required: true },
      utr: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        // Index defined separately below as a partial filter — declaring
        // `index: true` here too would create a duplicate, which Mongoose
        // warns about and then silently drops one of.
      },
      upiApp: {
        type: String,
        enum: ["phonepe", "gpay", "paytm", "bhim", "other"],
        required: true,
      },
      payerMobile: { type: String, required: true, trim: true },
      status: {
        type: String,
        enum: ["pending_verification", "approved", "rejected", "flagged"],
        default: "pending_verification",
        index: true,
      },
      rejectionReason: { type: String, default: null },
      // Idempotency key the client sends as `Idempotency-Key` header.
      // Server stores it for 24h in Redis with the resulting submission id
      // so retries with the same key return the original submission.
      idempotencyKey: { type: String, default: null, index: true },
      reviewedBy: { type: String, default: null },
      reviewedAt: { type: Date, default: null },
      notes: { type: String, default: null },
      createdAt: { type: Date, default: Date.now, index: true },
      updatedAt: { type: Date, default: Date.now },
    },
    { versionKey: false, timestamps: true },
  ),
);

// Admin dashboard query: oldest pending first.
PaymentSubmissionSchema.index({ status: 1, createdAt: 1 });
// Block duplicate active submissions per student/bootcamp. `flagged` is
// included so a student whose submission is held for review can't sneak in
// a second one and inflate the seat counter.
PaymentSubmissionSchema.index(
  { userId: 1, bootcampId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["pending_verification", "approved", "flagged"] },
    },
  },
);
// Catch duplicate UTRs submitted by different users (fraud signal).
PaymentSubmissionSchema.index(
  { utr: 1 },
  {
    partialFilterExpression: {
      status: { $in: ["pending_verification", "approved", "flagged"] },
    },
  },
);

export interface PaymentSubmission {
  id: string;
  userId: string;
  bootcampId: string;
  expectedAmountInPaise: number;
  utr: string;
  upiApp: "phonepe" | "gpay" | "paytm" | "bhim" | "other";
  payerMobile: string;
  status: "pending_verification" | "approved" | "rejected" | "flagged";
  rejectionReason: string | null;
  idempotencyKey: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const PaymentSubmissionModel: Model<PaymentSubmission> =
  (mongoose.models.PaymentSubmission as Model<PaymentSubmission>) ||
  mongoose.model<PaymentSubmission>(
    "PaymentSubmission",
    PaymentSubmissionSchema,
  );

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
      // Optional — free lead-gen webinars have no parent bootcamp.
      bootcampId: { type: String, index: true, default: null },
      instructorId: { type: String, index: true },
      title: String,
      description: String,
      startsAt: { type: String, index: true },
      durationMin: Number,
      status: { type: String, default: "scheduled", index: true },
      roomCode: { type: String, unique: true, index: true },
      // 'free' opens to any logged-in user; 'paid' enforces bootcamp enrollment.
      tier: { type: String, default: "free", index: true },
      // YouTube Live video ID. Admin pastes it once the broadcaster is up.
      // Until set, the /live/[code] page shows "starting soon" instead of the iframe.
      youtubeVideoId: { type: String, default: null },
      streamProvider: { type: String, default: "youtube" },
      cfLiveInputUid: { type: String, default: null },
      cfRtmpUrl: { type: String, default: null },
      cfStreamKey: { type: String, default: null },
      registeredStudentIds: [String],
      attendedStudentIds: [String],
      createdAt: { type: String, index: true },
      startedAt: String,
      endedAt: String,
      recordingUrl: String,
    },
    { versionKey: false },
  ),
);

export const LiveSessionModel: Model<LiveSession> =
  (mongoose.models.LiveSession as Model<LiveSession>) ||
  mongoose.model<LiveSession>("LiveSession", LiveSessionSchema);

// ---------- Live session chat ----------
// Chat messages live on a separate collection for fast appends + bounded
// query (latest N for a session). TTL index auto-purges after 7 days so we
// don't bloat the DB long-term — lecture chats aren't archive material.
const LiveSessionMessageSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      sessionId: { type: String, required: true, index: true },
      userId: { type: String, required: true, index: true },
      // Denormalised user name — keeps the chat render path zero-join.
      // Stale if user renames mid-session; acceptable for live chat.
      userName: { type: String, required: true },
      body: { type: String, required: true },
      createdAt: { type: Date, default: Date.now, index: true },
      deletedAt: { type: Date, default: null, index: true },
      deletedBy: { type: String, default: null },
    },
    { versionKey: false },
  ),
);
// TTL — automatic cleanup after 7 days. Mongo runs the reaper every 60 sec.
LiveSessionMessageSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 },
);
// Hot-path index — fetch the latest N for a session, paginated by id.
LiveSessionMessageSchema.index({ sessionId: 1, createdAt: -1 });

export interface LiveSessionMessage {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export const LiveSessionMessageModel: Model<LiveSessionMessage> =
  (mongoose.models.LiveSessionMessage as Model<LiveSessionMessage>) ||
  mongoose.model<LiveSessionMessage>(
    "LiveSessionMessage",
    LiveSessionMessageSchema,
  );

// ---------- Live session attendee (lead capture) ----------
// One doc per (session, user). Writes once on first chat-join. Used to:
//   • Count unique attendees for analytics
//   • Email follow-ups ("thanks for joining, here's the bootcamp")
//   • Build a marketing-allowed lead list for free sessions
// The composite _id prevents duplicate joins from creating extra rows.
const LiveSessionAttendeeSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true }, // `${sessionId}:${userId}`
      sessionId: { type: String, required: true, index: true },
      userId: { type: String, required: true, index: true },
      joinedAt: { type: Date, default: Date.now },
    },
    { versionKey: false },
  ),
);
LiveSessionAttendeeSchema.index({ sessionId: 1, joinedAt: 1 });

export interface LiveSessionAttendee {
  id: string;
  sessionId: string;
  userId: string;
  joinedAt: Date;
}

export const LiveSessionAttendeeModel: Model<LiveSessionAttendee> =
  (mongoose.models.LiveSessionAttendee as Model<LiveSessionAttendee>) ||
  mongoose.model<LiveSessionAttendee>(
    "LiveSessionAttendee",
    LiveSessionAttendeeSchema,
  );

// ---------- Session recordings ----------
const SessionRecordingSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      sessionId: { type: String, required: true, index: true },
      bootcampId: { type: String, required: true, index: true },
      instructorId: { type: String, required: true, index: true },
      sessionTitle: String,
      bootcampTitle: String,
      providerAssetId: String,
      playbackUrl: String,
      thumbnailUrl: String,
      durationSec: Number,
      sizeBytes: Number,
      status: { type: String, default: "pending_review", index: true },
      createdAt: { type: String, required: true, index: true },
      publishedAt: String,
      deletedAt: String,
      provider: { type: String, default: "mock" },
    },
    { versionKey: false },
  ),
);

export const SessionRecordingModel: Model<import("@/shared/types").SessionRecording> =
  (mongoose.models.SessionRecording as Model<import("@/shared/types").SessionRecording>) ||
  mongoose.model<import("@/shared/types").SessionRecording>(
    "SessionRecording",
    SessionRecordingSchema,
  );

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

// ---------- ProcessedTxn (payment idempotency) ----------
// One row per provider transaction id. We `findOneAndUpdate({_id: txnId},
// {$setOnInsert: ...}, {upsert: true})` so two concurrent callback+webhook
// races converge on the first inserter. If the doc already existed, we
// skip the plan-activation work.
export interface ProcessedTxn {
  id: string;
  provider: "phonepe" | "mock";
  orderId: string;
  userId: string;
  plan: "pro" | "premium" | "sponsorship";
  amountPaise: number;
  status: "success" | "failed" | "pending";
  processedAt: string;
  via: "callback" | "webhook";
}

const ProcessedTxnSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      provider: { type: String, required: true },
      orderId: { type: String, required: true, index: true },
      userId: { type: String, required: true, index: true },
      plan: { type: String, required: true },
      amountPaise: { type: Number, required: true },
      status: { type: String, required: true },
      processedAt: { type: String, required: true, index: true },
      via: { type: String, required: true },
    },
    { versionKey: false },
  ),
);

export const ProcessedTxnModel: Model<ProcessedTxn> =
  (mongoose.models.ProcessedTxn as Model<ProcessedTxn>) ||
  mongoose.model<ProcessedTxn>("ProcessedTxn", ProcessedTxnSchema);

// ---------- Partner (channel referrals) ----------
// Each row is a referral source. URL-safe `code` keys the public-facing
// link. `dashboardToken` is the bearer that authenticates the partner's
// dashboard at /p/<code>?key=<token>. Rotating the token re-issues the URL.
const PartnerSchema = withJsonTransform(
  new Schema(
    {
      _id: { type: String, required: true },
      code: { type: String, required: true, unique: true, index: true },
      name: { type: String, required: true },
      contactEmail: { type: String, required: true },
      commissionPct: { type: Number, default: 0 },
      dashboardToken: { type: String, required: true },
      active: { type: Boolean, default: true, index: true },
      notes: String,
      createdAt: { type: String, required: true },
      createdByAdminId: { type: String, required: true },
      tokenRotatedAt: String,
    },
    { versionKey: false },
  ),
);

export const PartnerModel: Model<import("@/shared/types").Partner> =
  (mongoose.models.Partner as Model<import("@/shared/types").Partner>) ||
  mongoose.model<import("@/shared/types").Partner>("Partner", PartnerSchema);

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
