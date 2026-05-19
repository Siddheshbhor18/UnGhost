// Domain types for NoGhost.com — single source of truth.

export type Role = "student" | "recruiter" | "admin" | "instructor";
export type Trajectory =
  | "actively_hunting"
  | "casually_exploring"
  | "open_to_magic";
export type Stage =
  | "new_matches"
  | "under_review"
  | "interview"
  | "offer"
  | "hired"
  | "rejected";
export type SLAHours = 24 | 48 | 72;

export interface HistoryEntry {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate: string | "Present";
  impact: string; // AI-condensed 2-sentence summary
}

export interface BootcampProgress {
  bootcampId: string;
  /** lesson/video ids the student has marked watched */
  videosWatched: string[];
  /** lesson ids whose skill-check passed (≥70%) */
  skillChecksPassed: string[];
  /** failed attempt count per lesson — gates retry cooldown */
  skillCheckAttempts: Record<string, number>;
  /** student notes per lesson (auto-saved) */
  notes: Record<string, string>;
  liveAttended: boolean;
  liveAttendancePct?: number;
  assignment?: {
    releasedAt: string;
    expiresAt: string;
    healthPauseUsed: boolean;
    submittedAt?: string;
    writeup?: string;
    reflection?: string;
    fileNames?: string[];
    grade?: {
      totalScore: number;
      perCriterion: Array<{ key: string; score: number; feedback: string }>;
      strengths: string[];
      improvements: string[];
      gradedAt: string;
    };
    leaderboardRank?: number;
    plagiarismFlag?: boolean;
  };
  /** verified-skill badge issued only after assignment.submittedAt */
  verifiedBadgeIssued: boolean;
}

export interface StudentProfile {
  alias: string;
  contactEmail: string;
  contactPhone?: string;
  trajectory: Trajectory;
  skills: string[];
  verifiedSkills: string[];
  enrolledBootcamps: string[]; // bootcamp ids
  history: HistoryEntry[];
  resumeUrl?: string;
  joinedAt: string;
  lastActiveAt: string;
  city?: string;
  remotePref?: "remote" | "hybrid" | "onsite";
  /** PRD: students opt into recruiter database search. Tied to trajectory by default. */
  searchVisibility?: boolean;
  /** PRD: "named" (default) reveals name+photo; "anonymous" hides until Stage 1. */
  applicationIdentity?: "named" | "anonymous";
  yearsExperience?: number;
  /** Per-bootcamp progress. Empty array for fresh students. */
  bootcampProgress?: BootcampProgress[];
}

export type InMailStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "ignored_refunded";

export interface InMail {
  id: string;
  recruiterId: string;
  recruiterName: string;        // denormalised
  companyName: string;
  studentId: string;
  /** Optional — tied to a specific job. */
  jobId?: string;
  jobTitle?: string;
  subject: string;
  body: string;
  sentAt: string;
  /** Status drives credit refund + cooldown logic */
  status: InMailStatus;
  respondedAt?: string;
  /** 14-day auto-refund deadline for ignored InMails. */
  refundDeadline: string;
}

export type CompanyStatus = "active" | "flagged" | "suspended";

export interface CompanyProfile {
  id: string;
  name: string;
  logoUrl: string;
  domain: string;
  description: string;
  recruiterIds: string[];
  /** Admin verification — gold checkmark on listings. */
  verified?: boolean;
  /** Admin-controlled lifecycle. */
  status?: CompanyStatus;
  suspendedReason?: string;
  suspendedAt?: string;
}

// Support ticket — Phase 1 mock-only (no schema).
export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type SupportTicketCategory =
  | "billing"
  | "payment"
  | "account"
  | "abuse"
  | "application"
  | "bootcamp"
  | "recruiter_dispute"
  | "bug"
  | "bug_report"
  | "feature_request"
  | "press"
  | "other";

export interface SupportTicket {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  priority: "low" | "normal" | "high" | "urgent";
  requesterEmail: string;
  requesterRole: Role;
  bodyPreview: string;
  createdAt: string;
  updatedAt: string;
  assignedToAdminId?: string;
}

export interface EmailTemplate {
  id: string;
  key: string;            // stable code, e.g. "verify_email"
  name: string;
  subject: string;
  body: string;
  variables: string[];
  lastEditedAt: string;
  lastEditedByAdminId?: string;
}

export type UserStatus = "active" | "suspended" | "banned" | "soft_deleted";

// ── Subscription plans (student-only) ─────────────────────────────────────
// FREE       → ₹0 · 2 lifetime applications · no AI Coach · no Q&A · no bootcamps
// PRO        → ₹999/month · 5 apps per 30-day window · AI Coach · Q&A
// PREMIUM    → ₹4999 one-time lifetime · unlimited apps · AI Coach · Q&A · all bootcamps free
export type SubscriptionPlan = "free" | "pro" | "premium";

export interface PlanLimits {
  /** "trial" = lifetime cap, "monthly" = rolling-30d cap, "unlimited" = no cap. */
  applicationCap:
    | { kind: "trial"; count: number }
    | { kind: "monthly"; count: number }
    | { kind: "unlimited" };
  aiCoach: boolean;
  questionAndAnswer: boolean;
  bootcampsIncluded: boolean;
}

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    applicationCap: { kind: "trial", count: 2 },
    aiCoach: false,
    questionAndAnswer: false,
    bootcampsIncluded: false,
  },
  pro: {
    applicationCap: { kind: "monthly", count: 5 },
    aiCoach: true,
    questionAndAnswer: true,
    bootcampsIncluded: false,
  },
  premium: {
    applicationCap: { kind: "unlimited" },
    aiCoach: true,
    questionAndAnswer: true,
    bootcampsIncluded: true,
  },
};

export const PLAN_PRICING: Record<
  SubscriptionPlan,
  { label: string; amountINR: number; cadence: "free" | "monthly" | "lifetime" }
> = {
  free:    { label: "Free",    amountINR: 0,    cadence: "free" },
  pro:     { label: "Pro",     amountINR: 999,  cadence: "monthly" },
  premium: { label: "Premium", amountINR: 4999, cadence: "lifetime" },
};

export interface User {
  id: string;
  email: string;
  passwordHash: string; // for mock, plain "demo"
  role: Role;
  name: string;
  avatarUrl?: string;
  profile?: StudentProfile;
  companyId?: string; // for recruiters
  /** Recruiter-only InMail credit balance (defaults to 50). */
  inMailCredits?: number;
  /** First recruiter at a company is Company Admin — invites/removes others. */
  isCompanyAdmin?: boolean;
  /** Admin-controlled account status. Defaults to active. */
  status?: UserStatus;
  suspendedUntil?: string;
  suspendedReason?: string;
  suspendedAt?: string;
  suspendedByAdminId?: string;
  /** AI Coach voice preference. Defaults to "balanced". */
  coachPersona?: CoachPersona;
  /** Rolling memory for the AI Coach (cross-session). */
  aiCoachMemory?: AICoachMemory;
  // ── Subscription ───────────────────────────────────────────────────────
  /** Active subscription plan. Defaults to "free". Recruiters/admins ignore. */
  plan?: SubscriptionPlan;
  /** Pricing cadence — "monthly" for pro, "lifetime" for premium. */
  planType?: "monthly" | "lifetime" | "free";
  /** ISO timestamp the current plan started. */
  planActivatedAt?: string;
  /** ISO timestamp the current plan expires. Null for premium (lifetime) + free. */
  planExpiresAt?: string;
  /** Last payment provider txn id (PhonePe). Used to dedupe callbacks. */
  lastBillingTxnId?: string;
  /** True after the user clicked Cancel on their Pro renewal. */
  planRenewalCancelled?: boolean;
  /** True once email-ownership has been proven via verify-email token. */
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  /** True once phone-ownership has been proven via OTP. */
  phoneVerified?: boolean;
  phoneVerifiedAt?: string;
  createdAt?: string;
}

export interface Job {
  id: string;
  companyId: string;
  recruiterId: string;
  title: string;
  skills: string[];
  location: string;
  remote: "remote" | "hybrid" | "onsite";
  slaHours: SLAHours;
  gauntletPrompt: string;
  description: string;
  salaryMin: number; // INR LPA
  salaryMax: number;
  createdAt: string;
  active: boolean;
}

export interface AssessmentGrade {
  score: number; // 0-100
  notes: string;
  verdict: "advance" | "reject" | "borderline";
  depthSignal: number; // 0-100
}

export interface AssessmentSubmission {
  prompt: string;
  response: string;
  submittedAt: string;
  grade?: AssessmentGrade;
  /** 0-100. Decremented by tab switches, paste attempts, suspicious timing. */
  integrityScore?: number;
  integrityFlags?: string[];
}

export interface Application {
  id: string;
  jobId: string;
  studentId: string;
  stage: Stage;
  matchPct: number;
  assessment?: AssessmentSubmission;
  createdAt: string;
  slaDeadline: string;
  interviewScheduledAt?: string;
  outcomeNotes?: string;
  /** Set when student self-withdraws. */
  withdrawnAt?: string;
  /** Set when student fires the one-shot "request update" ping. */
  updateRequestedAt?: string;
  /** Set when SLA cron flags a breach and credit refund is issued. */
  slaBreachedAt?: string;
  slaRefundIssued?: boolean;
}

export interface BootcampVideo {
  id: string;
  title: string;
  durationMin: number;
  posterUrl: string;
  verifyPrompt: string;
}

export type BootcampCategory =
  | "ai"
  | "data_science"
  | "marketing"
  | "finance"
  | "sales";

export type BootcampStatus =
  | "draft"
  | "in_review"
  | "published"
  | "changes_requested"
  | "archived";

export interface Bootcamp {
  id: string;
  skill: string;
  category: BootcampCategory;
  title: string;
  description: string;
  priceINR: number;
  durationWeeks: number;
  instructorId: string; // admin user id
  videos: BootcampVideo[];
  liveSlots: string[]; // ISO timestamps
  enrolledStudentIds: string[];
  rating: number;
  coverColor: string; // legacy neon token; ignored by glass UI
  /** Lifecycle status — defaults to "draft" on create, "published" on seed. */
  status?: BootcampStatus;
  /** Set when instructor clicks Submit for review. */
  submittedForReviewAt?: string;
  /** Set when admin requests changes — instructor sees the feedback. */
  reviewFeedback?: string;
}

export type SponsorshipStatus =
  | "payment_pending"
  | "offered"
  | "accepted"
  | "declined"
  | "expired"
  | "completed";

export interface Sponsorship {
  id: string;
  recruiterId: string;
  companyName: string;       // denormalised for student-side display
  studentId: string;
  bootcampId: string;
  /** Optional — when sponsorship is tied to a specific job application. */
  jobId?: string;
  pricePaid: number;         // INR (incl. GST)
  status: SponsorshipStatus;
  offeredAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  expiresAt: string;         // 30 days after offer per PRD
  completedAt?: string;
  /** PhonePe transaction reference. Absent while status === "payment_pending". */
  paymentRef?: string;
}

export interface SavedJob {
  id: string;
  studentId: string;
  jobId: string;
  savedAt: string;
}

export interface NotInterestedFeedback {
  id: string;
  studentId: string;
  jobId: string;
  dismissedAt: string;
  /** Optional structured reason — feeds the personalization vector. */
  reason?:
    | "wrong_role"
    | "wrong_location"
    | "wrong_pay"
    | "wrong_company"
    | "already_applied"
    | "not_qualified"
    | "other";
}

export interface MessageThread {
  id: string;
  /** Source of the conversation: an advanced application or an accepted InMail. */
  context:
    | { type: "application"; applicationId: string; jobId: string }
    | { type: "inmail"; inmailId: string };
  recruiterId: string;
  studentId: string;
  companyName: string;
  jobTitle?: string;
  createdAt: string;
  lastMessageAt: string;
  /** Quick preview for inbox surfaces. */
  lastPreview: string;
  /** Unread counts per role (decrements as each side reads). */
  unreadForRecruiter: number;
  unreadForStudent: number;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: "student" | "recruiter";
  body: string;
  createdAt: string;
  readBy: string[]; // userIds who have marked this read
}

export interface SavedSearch {
  id: string;
  recruiterId: string;
  name: string;
  /** Serialized CandidateSearchFilters JSON. */
  filtersJson: string;
  alertFrequency: "off" | "instant" | "daily" | "weekly";
  lastRunAt?: string;
  createdAt: string;
}

export interface JobTemplate {
  id: string;
  recruiterId: string;
  isCompanyShared: boolean;
  companyId?: string;
  name: string;
  title: string;
  skills: string[];
  gauntletPrompt: string;
  description: string;
  salaryMin: number;
  salaryMax: number;
  remote: "remote" | "hybrid" | "onsite";
  slaHours: SLAHours;
  location: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: Role;
  /** Canonical action name: "user.suspend", "bootcamp.approve", etc. */
  action: string;
  targetType: "user" | "bootcamp" | "job" | "application" | "company" | "message" | "system" | "sponsorship";
  targetId: string;
  summary: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after?: any;
  reason?: string;
  createdAt: string;
  meta?: { ip?: string; userAgent?: string };
}

export type ModerationKind =
  | "job_posting"
  | "user_message"
  | "bootcamp_assignment"
  | "user_profile"
  | "review";

export type ModerationDecision =
  | "pending"
  | "approved"
  | "removed_warning"
  | "removed_suspension"
  | "escalated";

export interface ModerationFlag {
  id: string;
  kind: ModerationKind;
  targetId: string;
  targetLabel: string;
  contentExcerpt: string;
  aiConfidence: number;
  reasons: string[];
  reportedBy: string;
  decision: ModerationDecision;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
  createdAt: string;
}

export type NotificationKind =
  | "application_graded"
  | "application_advanced"
  | "application_rejected"
  | "application_hired"
  | "sla_warning"
  | "sla_breached"
  | "sponsorship_offered"
  | "sponsorship_accepted"
  | "sponsorship_declined"
  | "inmail_received"
  | "inmail_accepted"
  | "inmail_declined"
  | "message_received"
  | "bootcamp_complete"
  | "skill_verified"
  | "plan_activated"
  | "system";

export type NotificationPriority = "low" | "normal" | "high" | "critical";

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  priority: NotificationPriority;
  title: string;
  body: string;
  /** Deep link to the related surface. */
  link?: string;
  /** Optional canonical actor display (company, recruiter, student, instructor). */
  actorLabel?: string;
  /** Marks whether the user needs to do something (vs FYI). */
  actionRequired?: boolean;
  createdAt: string;
  readAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  placement: "landing_hero" | "dashboard_top" | "bootcamp_inline";
  mediaUrl: string;
  headline: string;
  subtext: string;
  targetUrl: string;
  status: "draft" | "live" | "paused";
  createdAt: string;
}

export interface CoachMessage {
  id: string;
  role: "student" | "coach";
  content: string;
  ts: string;
}

// ---------- AI Coach: persistent conversations + persona + memory ----------
export type CoachPersona = "balanced" | "encouraging" | "direct" | "strategic";

export const COACH_PERSONAS: Array<{
  id: CoachPersona;
  label: string;
  tagline: string;
  systemNote: string;
}> = [
  {
    id: "balanced",
    label: "Balanced",
    tagline: "Friendly, structured, balanced advice.",
    systemNote:
      "Be warm yet structured. Mix encouragement with concrete next steps.",
  },
  {
    id: "encouraging",
    label: "Encouraging",
    tagline: "Warmer tone, celebrates progress, gentle nudges.",
    systemNote:
      "Lead with empathy. Acknowledge effort. Frame gaps as growth areas.",
  },
  {
    id: "direct",
    label: "Direct",
    tagline: "No fluff. Tells you what to fix and why.",
    systemNote:
      "Skip pleasantries. Get to specifics in the first sentence. Cite weaknesses bluntly but kindly.",
  },
  {
    id: "strategic",
    label: "Strategic",
    tagline: "Long-term career-moves lens; trade-offs and roadmaps.",
    systemNote:
      "Frame answers as 3-6 month roadmaps. Highlight trade-offs and second-order effects.",
  },
];

export interface AICoachConversation {
  id: string;
  studentId: string;
  title: string;
  preview: string;
  messages: Array<{
    role: "student" | "coach";
    content: string;
    ts: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// ---------- Live sessions (instructor/student rooms) ----------
export type LiveSessionStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled";

export interface LiveSession {
  id: string;
  bootcampId: string;
  instructorId: string;
  title: string;
  description?: string;
  /** ISO start time. */
  startsAt: string;
  durationMin: number;
  status: LiveSessionStatus;
  /** Short code used in /live/[code] URLs. */
  roomCode: string;
  registeredStudentIds: string[];
  attendedStudentIds: string[];
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  /** Quick-access URL for the legacy single-recording model. Prefer SessionRecording table. */
  recordingUrl?: string;
  /** 100ms room id, set when the session goes live. */
  videoRoomId?: string;
  videoProvider?: "100ms" | "mock";
}

/**
 * Recording capture per live session. Created automatically on
 * `recording.success` webhook from 100ms (or end-of-session for mock mode).
 * Instructor lands on /instructor/recordings and either:
 *   - publishes (keep on platform — students can watch async)
 *   - deletes (calls provider delete API, removes row)
 *
 * Status lifecycle:
 *   pending_review  → recording just landed, awaiting instructor decision
 *   published       → instructor chose Keep · students can view
 *   deleted         → instructor chose Delete · row kept for audit, URL stripped
 */
export type SessionRecordingStatus =
  | "pending_review"
  | "published"
  | "deleted";

export interface SessionRecording {
  id: string;
  sessionId: string;
  bootcampId: string;
  instructorId: string;
  /** Denormalised for fast list rendering — saves a join per row. */
  sessionTitle: string;
  bootcampTitle: string;
  /** Provider recording asset id — what we pass to deleteRecording(). */
  providerAssetId?: string;
  /** Public playback URL. Empty once status === "deleted". */
  playbackUrl?: string;
  /** Optional thumbnail snapshot. */
  thumbnailUrl?: string;
  durationSec?: number;
  sizeBytes?: number;
  status: SessionRecordingStatus;
  createdAt: string;
  /** When the instructor pressed Keep. */
  publishedAt?: string;
  /** When the instructor pressed Delete. */
  deletedAt?: string;
  provider: "100ms" | "mock";
}

export interface AICoachMemory {
  /** Short rolling summary (~250 chars) shown in the right rail. */
  summary?: string;
  /** Auto-collected facts ("aspires SDE-2", "weak in system design"). */
  facts?: string[];
  /** When memory was last refreshed by the rollup job. */
  updatedAt?: string;
}

// Derived placement view used by admin
export interface Placement {
  studentId: string;
  studentName: string;
  jobId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  stage: Stage;
  date: string;
  salaryRange?: string;
}
