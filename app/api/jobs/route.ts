import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { createJob, listJobs } from "@/server/store";

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
});

export async function GET() {
  return NextResponse.json(await listJobs());
}

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const parsed = await parseBody(req, CreateJobInput);
  if (!parsed.ok) return parsed.response;
  const b = parsed.data;
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
  });
  return NextResponse.json(job, { status: 201 });
}
