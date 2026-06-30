import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { withApiErrorTracking } from "@/server/lib/api-error";
import {
  createJob,
  listJobs,
  getCompanyById,
  getUserById,
  writeAuditLog,
} from "@/server/store";
import { isActiveUser } from "@/server/auth/account-status";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

const CreateJobInput = z.object({
  companyId: z.string().min(1).max(64),
  title: z.string().trim().min(3).max(200),
  skills: z.array(z.string().trim().max(60)).max(20).default([]),
  location: z.string().trim().max(100).default("Remote"),
  remote: z.enum(["remote", "hybrid", "onsite"]).default("hybrid"),
  slaHours: z.union([z.literal(24), z.literal(48), z.literal(72)]).default(48),
  gauntletPrompt: z.string().max(5000).default(""),
  description: z.string().max(10000).default(""),
  salaryMin: z.number().min(0).max(100_000_000).default(0),
  salaryMax: z.number().min(0).max(100_000_000).default(0),
  experienceMin: z.number().int().min(0).max(50).default(0),
  experienceMax: z.number().int().min(0).max(50).default(0),
}).refine(
  (b) => b.salaryMin === 0 || b.salaryMax === 0 || b.salaryMax >= b.salaryMin,
  {
    message: "salaryMax must be greater than or equal to salaryMin",
    path: ["salaryMax"],
  },
).refine(
  (b) => b.experienceMax === 0 || b.experienceMax >= b.experienceMin,
  {
    message: "experienceMax must be greater than or equal to experienceMin",
    path: ["experienceMax"],
  },
);

export async function GET() {
  return NextResponse.json(await listJobs());
}

async function handler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const parsed = await parseBody(req, CreateJobInput);
  if (!parsed.ok) return parsed.response;
  const b = parsed.data;

  // Ownership check (real security gate): a recruiter may only post jobs under
  // a company they belong to. Previously any recruiter could pass any
  // companyId. We accept the link either way it's stored — the user's assigned
  // companyId, or membership on the company's recruiterIds list.
  const [user, company] = await Promise.all([
    getUserById(session.user.id),
    getCompanyById(b.companyId),
  ]);
  if (!user) {
    return NextResponse.json({ error: "no_account" }, { status: 403 });
  }
  if (!isActiveUser(user)) {
    return NextResponse.json({ error: "account_inactive" }, { status: 403 });
  }
  if (!company) {
    return NextResponse.json({ error: "company_not_found" }, { status: 404 });
  }
  const ownsCompany =
    user.companyId === company.id ||
    (company.recruiterIds ?? []).includes(user.id);
  if (!ownsCompany) {
    logger.warn(
      { userId: user.id, companyId: b.companyId },
      "jobs.create-ownership-denied",
    );
    return NextResponse.json(
      { error: "not_your_company" },
      { status: 403 },
    );
  }

  // Suspended companies can't post at all.
  if (company.status === "suspended") {
    return NextResponse.json(
      { error: "company_suspended" },
      { status: 403 },
    );
  }

  // Recruiter onboarding is now self-serve (no admin approval), so jobs from a
  // linked, active, non-suspended recruiter publish instantly. Spam/abuse is
  // bounded by the per-recruiter rate limit below + the company-suspension gate
  // above rather than a pre-publish review queue.
  const job = await createJob({
    companyId: b.companyId,
    recruiterId: session.user.id,
    title: b.title,
    skills: b.skills,
    location: b.location,
    remote: b.remote,
    slaHours: b.slaHours,
    gauntletPrompt: b.gauntletPrompt,
    description: b.description,
    salaryMin: b.salaryMin,
    salaryMax: b.salaryMax,
    experienceMin: b.experienceMin,
    experienceMax: b.experienceMax,
    active: true,
  });

  void writeAuditLog({
    actorId: user.id,
    actorRole: "recruiter",
    action: "jobs.create-live",
    targetType: "job",
    targetId: job.id,
    summary: `Job "${b.title}" published (company ${company.id})`,
  }).catch(() => {
    /* audit failure must not block job creation */
  });

  return NextResponse.json({ ...job, pendingApproval: false }, { status: 201 });
}

// Rate limited per recruiter — 20 job posts/min is generous for a real user
// and stops a compromised/scripted account from flooding the feed.
export const POST = withRateLimit(
  { bucket: "jobs.create", limit: 20, windowSec: 60, by: "user" },
  withApiErrorTracking(handler),
);
