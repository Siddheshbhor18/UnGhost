// In-memory store for NoGhost. Single source of truth for the dev/demo build.
// Swap to Mongo later by changing only this file (keep the public function names).

import seedUsers from "./seeds/users.json";
import seedCompanies from "./seeds/companies.json";
import seedJobs from "./seeds/jobs.json";
import seedBootcamps from "./seeds/bootcamps.json";
import seedApplications from "./seeds/applications.json";
import seedCampaigns from "./seeds/campaigns.json";
import type {
  Application,
  Bootcamp,
  Campaign,
  CompanyProfile,
  Job,
  Placement,
  Role,
  Stage,
  User,
} from "./types";

// Use globalThis to survive HMR in dev
declare global {
  // eslint-disable-next-line no-var
  var __NG_STORE__: NGStore | undefined;
}

interface NGStore {
  users: User[];
  companies: CompanyProfile[];
  jobs: Job[];
  bootcamps: Bootcamp[];
  applications: Application[];
  campaigns: Campaign[];
}

function freshStore(): NGStore {
  return {
    users: structuredClone(seedUsers) as User[],
    companies: structuredClone(seedCompanies) as CompanyProfile[],
    jobs: structuredClone(seedJobs) as Job[],
    bootcamps: structuredClone(seedBootcamps) as Bootcamp[],
    applications: structuredClone(seedApplications) as Application[],
    campaigns: structuredClone(seedCampaigns) as Campaign[],
  };
}

function getStore(): NGStore {
  if (!globalThis.__NG_STORE__) {
    globalThis.__NG_STORE__ = freshStore();
  }
  return globalThis.__NG_STORE__;
}

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// USERS
export function listUsers(role?: Role): User[] {
  const s = getStore();
  return role ? s.users.filter((u) => u.role === role) : s.users;
}

export function getUserById(id: string): User | undefined {
  return getStore().users.find((u) => u.id === id);
}

export function getUserByEmail(email: string): User | undefined {
  return getStore().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function upsertUser(u: User): User {
  const s = getStore();
  const idx = s.users.findIndex((x) => x.id === u.id);
  if (idx >= 0) s.users[idx] = u;
  else s.users.push(u);
  return u;
}

// COMPANIES
export function listCompanies(): CompanyProfile[] {
  return getStore().companies;
}
export function getCompanyById(id: string): CompanyProfile | undefined {
  return getStore().companies.find((c) => c.id === id);
}

// JOBS
export function listJobs(): Job[] {
  return getStore().jobs.filter((j) => j.active);
}
export function listJobsByRecruiter(recruiterId: string): Job[] {
  return getStore().jobs.filter((j) => j.recruiterId === recruiterId);
}
export function getJobById(id: string): Job | undefined {
  return getStore().jobs.find((j) => j.id === id);
}
export function createJob(j: Omit<Job, "id" | "createdAt" | "active">): Job {
  const job: Job = {
    ...j,
    id: genId("job"),
    createdAt: new Date().toISOString(),
    active: true,
  };
  getStore().jobs.push(job);
  return job;
}

// APPLICATIONS
export function listApplications(): Application[] {
  return getStore().applications;
}
export function listApplicationsByStudent(studentId: string): Application[] {
  return getStore().applications.filter((a) => a.studentId === studentId);
}
export function listApplicationsByJob(jobId: string): Application[] {
  return getStore().applications.filter((a) => a.jobId === jobId);
}
export function listApplicationsByRecruiter(recruiterId: string): Application[] {
  const jobIds = listJobsByRecruiter(recruiterId).map((j) => j.id);
  return getStore().applications.filter((a) => jobIds.includes(a.jobId));
}
export function getApplicationById(id: string): Application | undefined {
  return getStore().applications.find((a) => a.id === id);
}
export function createApplication(
  a: Omit<Application, "id" | "createdAt" | "slaDeadline" | "stage">,
): Application {
  const job = getJobById(a.jobId);
  const slaH = job?.slaHours ?? 48;
  const now = new Date();
  const deadline = new Date(now.getTime() + slaH * 3600 * 1000);
  const app: Application = {
    ...a,
    id: genId("app"),
    stage: "new_matches",
    createdAt: now.toISOString(),
    slaDeadline: deadline.toISOString(),
  };
  getStore().applications.push(app);
  return app;
}
export function updateApplicationStage(
  id: string,
  stage: Stage,
  outcomeNotes?: string,
): Application | undefined {
  const a = getApplicationById(id);
  if (!a) return undefined;
  a.stage = stage;
  if (outcomeNotes) a.outcomeNotes = outcomeNotes;
  if (stage === "interview" && !a.interviewScheduledAt) {
    const t = new Date();
    t.setDate(t.getDate() + 3);
    a.interviewScheduledAt = t.toISOString();
  }
  return a;
}

// BOOTCAMPS
export function listBootcamps(): Bootcamp[] {
  return getStore().bootcamps;
}
export function getBootcampById(id: string): Bootcamp | undefined {
  return getStore().bootcamps.find((b) => b.id === id);
}
export function getBootcampForSkill(skill: string): Bootcamp | undefined {
  return getStore().bootcamps.find(
    (b) => b.skill.toLowerCase() === skill.toLowerCase(),
  );
}
export function enrollStudentInBootcamp(
  studentId: string,
  bootcampId: string,
): Bootcamp | undefined {
  const bc = getBootcampById(bootcampId);
  const user = getUserById(studentId);
  if (!bc || !user?.profile) return undefined;
  if (!bc.enrolledStudentIds.includes(studentId))
    bc.enrolledStudentIds.push(studentId);
  if (!user.profile.enrolledBootcamps.includes(bootcampId))
    user.profile.enrolledBootcamps.push(bootcampId);
  return bc;
}
export function markSkillVerified(studentId: string, skill: string): void {
  const u = getUserById(studentId);
  if (!u?.profile) return;
  if (!u.profile.verifiedSkills.includes(skill))
    u.profile.verifiedSkills.push(skill);
}

// CAMPAIGNS
export function listCampaigns(): Campaign[] {
  return getStore().campaigns;
}
export function listLiveCampaigns(placement: Campaign["placement"]): Campaign[] {
  return getStore().campaigns.filter(
    (c) => c.placement === placement && c.status === "live",
  );
}
export function upsertCampaign(c: Campaign): Campaign {
  const s = getStore();
  const idx = s.campaigns.findIndex((x) => x.id === c.id);
  if (idx >= 0) s.campaigns[idx] = c;
  else s.campaigns.push(c);
  return c;
}

// PLACEMENTS (derived view for admin)
export function listPlacements(): Placement[] {
  const s = getStore();
  const interviewed: Stage[] = ["interview", "offer", "hired"];
  return s.applications
    .filter((a) => interviewed.includes(a.stage))
    .map((a) => {
      const job = getJobById(a.jobId);
      const co = job ? getCompanyById(job.companyId) : undefined;
      const stu = getUserById(a.studentId);
      return {
        studentId: a.studentId,
        studentName: stu?.name ?? "—",
        jobId: a.jobId,
        jobTitle: job?.title ?? "—",
        companyId: job?.companyId ?? "—",
        companyName: co?.name ?? "—",
        stage: a.stage,
        date: a.interviewScheduledAt ?? a.createdAt,
        salaryRange:
          job ? `₹${job.salaryMin}–${job.salaryMax} LPA` : undefined,
      };
    });
}

// AGGREGATES for admin metrics
export interface GlobalMetrics {
  liveRevenueINR: number;
  ghostingRatePct: number; // recruiters missing SLA
  activeMissions: number;
  totalStudents: number;
  totalRecruiters: number;
  enrollments: number;
  placements: number;
}

export function getGlobalMetrics(): GlobalMetrics {
  const s = getStore();
  const students = s.users.filter((u) => u.role === "student");
  const recruiters = s.users.filter((u) => u.role === "recruiter");
  const enrollments = s.bootcamps.reduce(
    (acc, b) => acc + b.enrolledStudentIds.length,
    0,
  );
  const liveRevenueINR = s.bootcamps.reduce(
    (acc, b) => acc + b.enrolledStudentIds.length * b.priceINR,
    0,
  );
  const placements = listPlacements().length;
  const now = Date.now();
  const breached = s.applications.filter(
    (a) =>
      ["new_matches", "under_review"].includes(a.stage) &&
      new Date(a.slaDeadline).getTime() < now,
  ).length;
  const total = s.applications.length || 1;
  return {
    liveRevenueINR,
    ghostingRatePct: Math.round((breached / total) * 100),
    activeMissions: s.jobs.filter((j) => j.active).length,
    totalStudents: students.length,
    totalRecruiters: recruiters.length,
    enrollments,
    placements,
  };
}

// SKILL HEATMAP: count failures (grade.score < 60) per skill from all jobs
export interface SkillFailRow {
  skill: string;
  attempts: number;
  failures: number;
  failureRate: number;
}
export function getSkillGapHeatmap(): SkillFailRow[] {
  const s = getStore();
  const skillBuckets = new Map<string, { attempts: number; failures: number }>();
  for (const a of s.applications) {
    if (!a.assessment?.grade) continue;
    const job = getJobById(a.jobId);
    if (!job) continue;
    const failed = a.assessment.grade.score < 60;
    for (const skill of job.skills) {
      const b = skillBuckets.get(skill) ?? { attempts: 0, failures: 0 };
      b.attempts++;
      if (failed) b.failures++;
      skillBuckets.set(skill, b);
    }
  }
  return Array.from(skillBuckets.entries())
    .map(([skill, v]) => ({
      skill,
      attempts: v.attempts,
      failures: v.failures,
      failureRate: v.attempts ? Math.round((v.failures / v.attempts) * 100) : 0,
    }))
    .sort((a, b) => b.failureRate - a.failureRate);
}
