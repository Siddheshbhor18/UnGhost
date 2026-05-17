import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { createJob, listJobs } from "@/server/store";
import type { SLAHours } from "@/shared/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await listJobs());
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const b = await req.json();
  const job = await createJob({
    companyId: b.companyId,
    recruiterId: session.user.id,
    title: b.title,
    skills: b.skills ?? [],
    location: b.location ?? "Remote",
    remote: b.remote ?? "hybrid",
    slaHours: (b.slaHours as SLAHours) ?? 48,
    gauntletPrompt: b.gauntletPrompt ?? "",
    description: b.description ?? "",
    salaryMin: Number(b.salaryMin) || 0,
    salaryMax: Number(b.salaryMax) || 0,
  });
  return NextResponse.json(job, { status: 201 });
}
