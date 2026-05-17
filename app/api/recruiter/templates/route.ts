import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  createJobTemplate,
  getUserById,
  listJobTemplatesForRecruiter,
} from "@/server/store";
import type { JobTemplate, SLAHours } from "@/shared/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json([], { status: 200 });
  }
  const user = await getUserById(session.user.id);
  return NextResponse.json(
    await listJobTemplatesForRecruiter(session.user.id, user?.companyId),
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as Partial<JobTemplate> | null;
  if (!body?.name?.trim() || !body.title?.trim()) {
    return NextResponse.json(
      { error: "name + title required" },
      { status: 400 },
    );
  }
  const user = await getUserById(session.user.id);
  const out = await createJobTemplate({
    recruiterId: session.user.id,
    companyId: user?.companyId,
    isCompanyShared: body.isCompanyShared ?? false,
    name: body.name.trim().slice(0, 80),
    title: body.title.trim().slice(0, 120),
    skills: body.skills ?? [],
    gauntletPrompt: body.gauntletPrompt ?? "",
    description: body.description ?? "",
    salaryMin: body.salaryMin ?? 0,
    salaryMax: body.salaryMax ?? 0,
    remote: body.remote ?? "hybrid",
    slaHours: (body.slaHours ?? 48) as SLAHours,
    location: body.location ?? "",
  });
  return NextResponse.json(out, { status: 201 });
}
