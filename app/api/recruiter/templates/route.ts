import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import {
  createJobTemplate,
  getUserById,
  listJobTemplatesForRecruiter,
} from "@/server/store";
import type { SLAHours } from "@/shared/types";

export const runtime = "nodejs";

const Input = z.object({
  name: z.string().trim().min(1).max(80),
  title: z.string().trim().min(3).max(120),
  skills: z.array(z.string().trim().max(60)).max(20).optional(),
  gauntletPrompt: z.string().max(5000).optional(),
  description: z.string().max(10000).optional(),
  salaryMin: z.number().min(0).max(100_000_000).optional(),
  salaryMax: z.number().min(0).max(100_000_000).optional(),
  remote: z.enum(["remote", "hybrid", "onsite"]).optional(),
  slaHours: z.union([z.literal(24), z.literal(48), z.literal(72)]).optional(),
  location: z.string().trim().max(100).optional(),
  isCompanyShared: z.boolean().optional(),
});

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
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const user = await getUserById(session.user.id);
  const out = await createJobTemplate({
    recruiterId: session.user.id,
    companyId: user?.companyId,
    isCompanyShared: body.isCompanyShared ?? false,
    name: body.name,
    title: body.title,
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
