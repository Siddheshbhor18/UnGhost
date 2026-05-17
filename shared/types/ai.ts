// AI adapter type contracts. Pure data shapes — no implementation.
// Lives in shared/ so UI components can import without crossing the
// component → server boundary.
import type { Bootcamp, BootcampVideo, Job, StudentProfile } from "./index";

export interface ParsedResume {
  alias: string;
  contactEmail: string;
  contactPhone?: string;
  city?: string;
  skills: string[];
  history: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate: string;
    impact: string;
  }>;
}

export interface MatchResult {
  matchPct: number;
  reasoning: string;
}

export interface WhyMatchResult {
  /** 3-sentence personalised summary shown on the Mission Brief. */
  summary: string;
  /** 2-4 standout strengths (verified skills first). */
  strengths: string[];
  /** Risks that might block advancement — gentle, action-oriented. */
  risks: string[];
}

export interface GradeResult {
  score: number;
  notes: string;
  verdict: "advance" | "reject" | "borderline";
  depthSignal: number;
}

export interface CoachReply {
  message: string;
  suggestions: string[];
}

export interface SkillCheckQuestion {
  id: string;
  prompt: string;
  type: "mcq" | "short";
  options?: string[];
  correctIdx?: number;
  rubric?: string;
}

export interface SkillCheckGrade {
  score: number;
  passed: boolean;
  perQuestion: Array<{ questionId: string; correct: boolean; feedback: string }>;
  summary: string;
}

export interface AssignmentSubmission {
  writeup: string;
  reflection: string;
  fileNames?: string[];
}

export interface AssignmentRubricCriterion {
  key: string;
  label: string;
  description: string;
}

export interface AssignmentGrade {
  totalScore: number;
  perCriterion: Array<{ key: string; score: number; feedback: string }>;
  strengths: string[];
  improvements: string[];
  plagiarismFlag: boolean;
  aiGeneratedLikelihood: number;
}

export interface TutorReply {
  message: string;
  suggestions: string[];
}

export interface DraftMessageContext {
  senderRole: "student" | "recruiter";
  recipientName?: string;
  jobTitle?: string;
  companyName?: string;
  recentMessages?: Array<{ role: "student" | "recruiter"; body: string }>;
  intent?: string;
}

export interface AIAdapter {
  parseResume: (rawText: string) => Promise<ParsedResume>;
  matchScore: (profile: StudentProfile, job: Job) => Promise<MatchResult>;
  whyMatch: (profile: StudentProfile, job: Job) => Promise<WhyMatchResult>;
  gradeAssessment: (prompt: string, response: string, job: Job) => Promise<GradeResult>;
  draftMessage: (ctx: DraftMessageContext) => Promise<string>;
  chatCoach: (
    history: Array<{ role: "student" | "coach"; content: string }>,
    profile?: StudentProfile,
  ) => Promise<CoachReply>;
  parseJD: (jdText: string) => Promise<{
    title: string;
    skills: string[];
    gauntletPrompt: string;
    description: string;
    salaryMin: number;
    salaryMax: number;
  }>;
  chatTutor: (
    history: Array<{ role: "student" | "tutor"; content: string }>,
    context: { bootcamp: Bootcamp; video?: BootcampVideo; timestampSec?: number },
  ) => Promise<TutorReply>;
  gradeSkillCheck: (
    answers: Array<{ questionId: string; answer: string | number }>,
    questions: SkillCheckQuestion[],
  ) => Promise<SkillCheckGrade>;
  gradeAssignment: (
    submission: AssignmentSubmission,
    rubric: AssignmentRubricCriterion[],
  ) => Promise<AssignmentGrade>;
}
