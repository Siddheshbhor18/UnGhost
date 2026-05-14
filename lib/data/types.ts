// Domain types for NoGhost.com — single source of truth.

export type Role = "student" | "recruiter" | "admin";
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
}

export interface CompanyProfile {
  id: string;
  name: string;
  logoUrl: string;
  domain: string;
  description: string;
  recruiterIds: string[];
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
}

export interface BootcampVideo {
  id: string;
  title: string;
  durationMin: number;
  posterUrl: string;
  verifyPrompt: string;
}

export interface Bootcamp {
  id: string;
  skill: string;
  title: string;
  description: string;
  priceINR: number;
  durationWeeks: number;
  instructorId: string; // admin user id
  videos: BootcampVideo[];
  liveSlots: string[]; // ISO timestamps
  enrolledStudentIds: string[];
  rating: number;
  coverColor: string; // neon palette token
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
