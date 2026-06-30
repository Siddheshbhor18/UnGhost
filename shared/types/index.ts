// Domain types for NoGhost.com — single source of truth.

export type Role = "student" | "recruiter" | "admin" | "instructor" | "creator";
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
  /** attempt count per lesson in the current window — resets after cooldown */
  skillCheckAttempts: Record<string, number>;
  /** ISO timestamp of the last skill-check attempt per lesson. Used to enforce
   *  the retry cooldown and reset the attempt counter once it elapses. */
  skillCheckLastAttempt?: Record<string, string>;
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
      /** Set when an instructor has reviewed + (optionally) overridden the
       *  AI grade. The original AI numbers stay in `aiGrade` for audit. */
      reviewedByInstructorId?: string;
      reviewedAt?: string;
      instructorNote?: string;
      /** Snapshot of the AI's original grade — preserved when an instructor
       *  overrides any field above so the override is auditable. */
      aiGrade?: {
        totalScore: number;
        perCriterion: Array<{ key: string; score: number; feedback: string }>;
        strengths: string[];
        improvements: string[];
        gradedAt: string;
      };
    };
    leaderboardRank?: number;
    plagiarismFlag?: boolean;
    /** AI's estimate (0-100) that the submission was machine-generated.
     *  Surfaced to instructors during grading review. */
    aiGeneratedLikelihood?: number;
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
  /** Canonical skill keys (Phase 2 taxonomy). Display still uses `skills`. */
  skillIds?: string[];
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
// Tiers:
// FREE            → ₹0 · 2 lifetime applications · no AI Coach · no Q&A
// JOBS_QUARTERLY  → ₹149 · 3 months · unlimited applications · AI Coach · Q&A
// JOBS_ANNUAL     → ₹299 · 1 year · unlimited applications · AI Coach · Q&A
// PREMIUM (legacy)→ retired for new sales; existing holders grandfathered until
//                   expiry (unlimited apps + AI Coach + Q&A + all bootcamps).
// Bootcamp access is no longer bundled here — it is bought per-course (₹5k) via
// shared/lib/courses.ts and tracked on User.ownedCourses.
export type SubscriptionPlan =
  | "free"
  | "jobs_quarterly"
  | "jobs_annual"
  | "premium";

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
  jobs_quarterly: {
    applicationCap: { kind: "unlimited" },
    aiCoach: true,
    questionAndAnswer: true,
    bootcampsIncluded: false,
  },
  jobs_annual: {
    applicationCap: { kind: "unlimited" },
    aiCoach: true,
    questionAndAnswer: true,
    bootcampsIncluded: false,
  },
  // Legacy all-in-one. Not sold anymore; grandfathered holders keep bootcamp
  // access via bootcampsIncluded until planExpiresAt.
  premium: {
    applicationCap: { kind: "unlimited" },
    aiCoach: true,
    questionAndAnswer: true,
    bootcampsIncluded: true,
  },
};

export const PLAN_PRICING: Record<
  SubscriptionPlan,
  {
    label: string;
    amountINR: number;
    cadence: "free" | "quarterly" | "annual" | "lifetime";
    /** Access duration granted per purchase; null = not time-bound. */
    durationDays: number | null;
  }
> = {
  free:           { label: "Free",             amountINR: 0,    cadence: "free",      durationDays: null },
  jobs_quarterly: { label: "Jobs · 3 months",  amountINR: 149,  cadence: "quarterly", durationDays: 90 },
  jobs_annual:    { label: "Jobs · 1 year",    amountINR: 299,  cadence: "annual",    durationDays: 365 },
  premium:        { label: "Premium (legacy)", amountINR: 4999, cadence: "annual",    durationDays: 365 },
};

/** Plans a student can actively purchase today (premium is retired). */
export const PURCHASABLE_JOBS_PLANS = ["jobs_quarterly", "jobs_annual"] as const;
export type PurchasableJobsPlan = (typeof PURCHASABLE_JOBS_PLANS)[number];

/**
 * Premium is priced **exclusive of tax**. `amountINR` above is the base; this
 * GST is added on top and collected from the buyer at checkout.
 */
export const PREMIUM_GST_PERCENT = 18;

/** Platform GST rate (%). Applies to every paid SKU — jobs plans, courses,
 *  and legacy premium. (`PREMIUM_GST_PERCENT` kept as an alias for back-compat.) */
export const GST_PERCENT = 18;

/**
 * Premium is a **1-year** plan. A purchase grants access for this many days
 * from the activation timestamp; the daily subscription-sweep cron demotes
 * the user back to Free once `planExpiresAt` passes.
 */
export const PREMIUM_PLAN_DURATION_DAYS = 365;

/**
 * @deprecated Launch-era lifetime seat cap. The plan is now annual, so the
 * cap no longer gates the live Razorpay checkout. Kept only so the dormant
 * PhonePe/manual-payment routes still compile. Do not use in new code.
 */
export const PREMIUM_LIFETIME_SEATS = 150;

/** A time-bound bootcamp-course grant. `course` is the room id; access is valid
 *  while `expiresAt` is in the future (3 months from purchase, renewable). */
export interface CourseGrant {
  course: BootcampCategory;
  grantedAt: string;
  expiresAt: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string; // for mock, plain "demo"
  role: Role;
  name: string;
  avatarUrl?: string;
  profile?: StudentProfile;
  companyId?: string; // for recruiters
  /** Company name the recruiter entered at signup, before an admin approves
   *  them into a real Company record. Cleared on approval. */
  pendingCompanyName?: string;
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
  /** Session-revocation counter. Bumped on ban / suspend / password reset.
   *  Issued JWTs embed the epoch they were minted at; edge middleware forces
   *  re-auth once the stored value moves ahead. Defaults to 0. */
  sessionEpoch?: number;
  /** AI Coach voice preference. Defaults to "balanced". */
  coachPersona?: CoachPersona;
  /** Rolling memory for the AI Coach (cross-session). */
  aiCoachMemory?: AICoachMemory;
  // ── Subscription ───────────────────────────────────────────────────────
  /** Active subscription plan. Defaults to "free". Recruiters/admins ignore. */
  plan?: SubscriptionPlan;
  /** Pricing cadence — "annual" for premium, "lifetime" for grandfathered
   *  launch buyers, "monthly" for legacy pro, "free" otherwise. */
  planType?: "monthly" | "quarterly" | "annual" | "lifetime" | "free";
  /** ISO timestamp the current plan started. */
  planActivatedAt?: string;
  /** ISO timestamp the current plan expires. Null for premium (lifetime) + free. */
  planExpiresAt?: string;
  /** Bootcamp **courses** (rooms) the student has bought. Each ₹5k purchase
   *  grants 3-month access to every cohort in that room; a re-purchase renews
   *  the term. Resolved through the bundle engine (shared/lib/courses.ts). */
  ownedCourses?: CourseGrant[];
  /** Last payment provider txn id (PhonePe). Used to dedupe callbacks. */
  lastBillingTxnId?: string;
  /** True after the user clicked Cancel on their Pro renewal. */
  planRenewalCancelled?: boolean;
  /** True once email-ownership has been proven via verify-email token. */
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  createdAt?: string;
  /** Channel-partner attribution. Set on signup if a `?ref=<code>` was
   *  captured during the visit. Powers /admin/partners + /p/[code] stats. */
  referrerPartnerId?: string;
  referrerCapturedAt?: string;
  /** Creator-platform attribution. Set ONCE at signup if a valid `ug_ref`
   *  referral-session cookie was present (first-touch wins, immutable —
   *  enforced in the service layer). `creatorId` here equals the creator's
   *  `User._id`. Powers the creator dashboard + reward engine. */
  referredByCreatorId?: string;
  /** The `referralSessions.sessionToken` that produced the attribution above. */
  referralSessionId?: string;
  /** OAuth provider used on first signin ("google" | "linkedin"). Null/absent
   *  for credentials-only signups. Informational — auth decisions never key
   *  off this field. */
  oauthProvider?: "google" | "linkedin" | null;
}

/**
 * Channel partner (referral). Each row owns a unique short `code` and a long
 * `dashboardToken`. The partner's URL is `unghost.in/p/<code>?key=<token>`.
 * Signups arriving with `?ref=<code>` get attributed.
 */
export interface Partner {
  id: string;
  /** URL-safe slug, e.g. "acme-college-mumbai". Unique. */
  code: string;
  name: string;
  contactEmail: string;
  /** Percentage of paid-conversion revenue owed to the partner (0-50). */
  commissionPct: number;
  /** Long random hex — bearer token for the partner's dashboard URL. */
  dashboardToken: string;
  /** When true, /signup attribution still works; when false, link returns 404. */
  active: boolean;
  notes?: string;
  createdAt: string;
  createdByAdminId: string;
  tokenRotatedAt?: string;
  /** Set once by `scripts/migrate-partners-to-creators.ts` when this legacy
   *  partner has been mirrored into the Creator system. Holds the new creator's
   *  `User._id`. Presence ⇒ already migrated (re-run short-circuit). Never read
   *  by live partner code — purely a one-way migration idempotency marker. */
  migratedToCreatorId?: string;
}

/** Aggregate stats for a single partner. Computed on demand. */
export interface PartnerStats {
  partnerId: string;
  signups: number;
  paidPremium: number;
  /** Estimated commission in INR rupees (not paise). */
  estCommissionINR: number;
}

export interface Job {
  id: string;
  companyId: string;
  recruiterId: string;
  title: string;
  skills: string[];
  /** Canonical skill keys (Phase 2 taxonomy). Display still uses `skills`. */
  skillIds?: string[];
  location: string;
  remote: "remote" | "hybrid" | "onsite";
  slaHours: SLAHours;
  gauntletPrompt: string;
  description: string;
  salaryMin: number; // INR LPA
  salaryMax: number;
  /** Required years of experience (range). 0/0 means unspecified. */
  experienceMin: number;
  experienceMax: number;
  createdAt: string;
  active: boolean;
}

/** Phase 2 canonical skill taxonomy entry. `id` == the normalized canonical key. */
export interface Skill {
  id: string;
  canonicalName: string;
  aliases: string[];
  category?: string;
  source?: string;
  createdAt?: string;
}

/** A skill seen in the wild that isn't in the taxonomy yet — admin-curated. */
export interface PendingSkill {
  id: string;
  rawSamples: string[];
  occurrences: number;
  decision: "pending" | "approved" | "rejected" | "merged";
  suggestedCanonical?: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
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
  /** Raw proctoring counts captured during the assessment, surfaced to recruiters. */
  tabSwitches?: number;
  pasteAttempts?: number;
  /** Seconds the candidate spent on the assessment. */
  timeTakenSec?: number;
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
  /** True once the application has actually been submitted to the recruiter
   *  (assessment passed). A failed attempt is saved as submitted=false — it's
   *  private to the student (retryable, no SLA, no recruiter notification, not
   *  counted against quota) until they pass. Absent on legacy rows ⇒ treated
   *  as submitted (true). */
  submitted?: boolean;
  interviewScheduledAt?: string;
  outcomeNotes?: string;
  /** Set when student self-withdraws. */
  withdrawnAt?: string;
  /** Set when student fires the one-shot "request update" ping. */
  updateRequestedAt?: string;
  /** Set the first time a recruiter moves the application off new_matches —
   *  the real "time to first response" anchor for analytics. */
  firstResponseAt?: string;
  /** Set when the application reaches the "hired" stage — the real
   *  "time to hire" anchor for analytics. */
  hiredAt?: string;
  /** Set when SLA cron flags a breach and credit refund is issued. */
  slaBreachedAt?: string;
  slaRefundIssued?: boolean;
  /** Set the first time the sweep sends the T-12h / T-4h SLA warning. Lets the
   *  sweep run frequently while firing each warning exactly once (not every
   *  run). Absent ⇒ that warning hasn't been sent yet. */
  slaWarn12hSentAt?: string;
  slaWarn4hSentAt?: string;
}

export interface BootcampVideo {
  id: string;
  title: string;
  durationMin: number;
  posterUrl: string;
  verifyPrompt: string;
  /** Optional instructor-defined module/section name. Consecutive lessons
   *  sharing a moduleTitle render under one heading on the learn page;
   *  lessons without one fall under a default "Lessons" group. */
  moduleTitle?: string;
  /** Instructor-written lesson summary shown on the learn page's Overview
   *  tab. Optional — the UI falls back to the bootcamp description. */
  description?: string;
  /** Playback URL — either a direct video file (R2/S3 .mp4/.m3u8) or a
   *  YouTube watch/share URL. The student "learn" player auto-routes:
   *  YouTube URLs render in a chrome-stripped iframe, everything else
   *  goes through an HTML5 <video> tag. Null until the instructor
   *  pastes/uploads a source. */
  url?: string | null;
}

// Bootcamp categories ("rooms") are defined once in ../rooms and re-exported
// here so existing `@/shared/types` imports keep working.
import type { BootcampCategory } from "../rooms";
export type { BootcampCategory };

export type BootcampStatus =
  | "draft"
  | "in_review"
  | "published"
  | "changes_requested"
  | "archived";

/** One live session inside a bootcamp. Used by the Vercel-cron Meet
 *  provisioning + the JoinSessionButton. */
export interface BootcampSession {
  id: string;
  title: string;
  /** ISO timestamp. Null = admin hasn't scheduled this session yet. */
  scheduledFor: string | null;
  durationMinutes: number;
  /** Populated by the daily cron at ~midnight IST for tomorrow's sessions. */
  meetUrl: string | null;
  calendarEventId: string | null;
  /** Manually uploaded by instructor post-session (Drive / YouTube / R2). */
  recordingUrl: string | null;
}

export interface Bootcamp {
  id: string;
  skill: string;
  category: BootcampCategory;
  title: string;
  description: string;
  /** @deprecated kept for backwards-compat reads. Use `priceInPaise`. */
  priceINR: number;
  /** Authoritative price in paise. All checkout math goes through computeTotalPaise(). */
  priceInPaise: number;
  /** GST rate (integer percent). Default 18%. */
  gstPercent: number;
  durationWeeks: number;
  instructorId: string; // admin user id
  videos: BootcampVideo[];
  liveSlots: string[]; // ISO timestamps (legacy — superseded by sessions[].scheduledFor)
  enrolledStudentIds: string[];
  rating: number;
  coverColor: string; // legacy neon token; ignored by glass UI
  /** Lifecycle status — defaults to "draft" on create, "published" on seed. */
  status?: BootcampStatus;
  /** Set when instructor clicks Submit for review. */
  submittedForReviewAt?: string;
  /** Set when admin requests changes — instructor sees the feedback. */
  reviewFeedback?: string;
  /** Manual-payment seat counter — incremented when a QR payment submission is
   *  created, decremented on reject. Used by the payment-approval flow. */
  currentSubmissionCount: number;
  /** Live sessions schedule. Meet URLs filled by daily cron. */
  sessions: BootcampSession[];
}

/**
 * A guest-lecture video a recruiter posts into a subject room's lecture
 * library. Standalone — not tied to a bootcamp cohort. Recruiter accounts are
 * provisioned manually for trusted lecturers, so lectures publish instantly;
 * an admin can take one down for hygiene.
 */
export interface RoomLecture {
  id: string;
  /** Which of the 5 subject rooms this lecture lives in. */
  room: BootcampCategory;
  /** The recruiter (provisioned lecturer) who posted it. */
  recruiterId: string;
  /** Optional company attribution for display. */
  companyId?: string;
  title: string;
  description: string;
  /** Playback URL — R2/public file or a YouTube watch/share URL. */
  videoUrl: string;
  posterUrl?: string;
  durationMin?: number;
  createdAt: string;
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
  targetType:
    | "user"
    | "bootcamp"
    | "job"
    | "application"
    | "company"
    | "message"
    | "system"
    | "sponsorship"
    // Admin-surface targets — added when /admin/campaigns, /admin/emails,
    // /admin/support became real persistence pages.
    | "campaign"
    | "email_template"
    | "support_ticket"
    // Partner attribution flow.
    | "partner"
    // Video access auditing.
    | "live_session"
    // Recruiter guest-lecture videos in room libraries.
    | "lecture";
  targetId: string;
  summary: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after?: any;
  reason?: string;
  createdAt: string;
  meta?: Record<string, unknown>;
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

/** "free" sessions are lead-gen webinars open to any logged-in user.
 *  "paid" sessions are gated by enrollment in the linked bootcamp. */
export type LiveSessionTier = "free" | "paid";

export interface LiveSession {
  id: string;
  /** Optional now — free lead-gen sessions have no bootcamp parent. */
  bootcampId?: string | null;
  instructorId: string;
  title: string;
  description?: string;
  /** ISO start time. */
  startsAt: string;
  durationMin: number;
  status: LiveSessionStatus;
  /** Short code used in /live/[code] URLs. */
  roomCode: string;
  /** Free vs paid — controls auth gate. Default 'free'. */
  tier?: LiveSessionTier;
  /** YouTube Live video ID. Pasted by admin once the broadcaster goes live.
   *  Until set, the session page shows a "starting soon" placeholder. */
  youtubeVideoId?: string | null;
  /** Which video provider powers this session. Default "youtube". */
  streamProvider?: "youtube" | "cloudflare";
  /** Cloudflare Stream Live Input UID. Set on creation for CF sessions. */
  cfLiveInputUid?: string | null;
  /** RTMP ingest URL for instructor's OBS. Admin-only — never sent to students. */
  cfRtmpUrl?: string | null;
  /** Stream key for RTMP auth. Admin-only — never sent to students. */
  cfStreamKey?: string | null;
  registeredStudentIds: string[];
  attendedStudentIds: string[];
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  /** Quick-access URL for the legacy single-recording model. Prefer SessionRecording table. */
  recordingUrl?: string;
}

/**
 * Recording capture per live session. Created automatically on
 * session end (instructor marks session ended → recording URL is set).
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
  provider: "youtube" | "cloudflare" | "mock";
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
