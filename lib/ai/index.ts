// AI adapter interface — swap mock for Claude by toggling ANTHROPIC_API_KEY.
import type { Job, StudentProfile } from "@/lib/data/types";
import { mockAdapter } from "./mock";
import { claudeAdapter } from "./claude";

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

export interface AIAdapter {
  parseResume: (rawText: string) => Promise<ParsedResume>;
  matchScore: (profile: StudentProfile, job: Job) => Promise<MatchResult>;
  gradeAssessment: (prompt: string, response: string, job: Job) => Promise<GradeResult>;
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
}

export function getAI(): AIAdapter {
  if (process.env.ANTHROPIC_API_KEY) return claudeAdapter;
  return mockAdapter;
}
