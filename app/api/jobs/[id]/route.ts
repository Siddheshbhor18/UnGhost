import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { getJobById, updateJob } from "@/server/store";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const job = await getJobById(params.id);
  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(job);
}

const PatchInput = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  location: z.string().trim().max(80).optional(),
  remote: z.enum(["remote", "hybrid", "onsite"]).optional(),
  slaHours: z.union([z.literal(24), z.literal(48), z.literal(72)]).optional(),
  gauntletPrompt: z.string().trim().max(5000).optional(),
  description: z.string().trim().max(8000).optional(),
  salaryMin: z.number().int().min(0).max(10000).optional(),
  salaryMax: z.number().int().min(0).max(10000).optional(),
  experienceMin: z.number().int().min(0).max(50).optional(),
  experienceMax: z.number().int().min(0).max(50).optional(),
  /** Close (false) / reopen (true) the mission. */
  active: z.boolean().optional(),
});

/**
 * PATCH /api/jobs/[id] — the owning recruiter edits or closes/reopens their
 * mission. Ownership + field whitelisting are enforced in updateJob.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const parsed = await parseBody(req, PatchInput);
  if (!parsed.ok) return parsed.response;

  const updated = await updateJob(params.id, session.user.id, parsed.data);
  if (!updated) {
    return NextResponse.json(
      { error: "not_found_or_not_yours" },
      { status: 404 },
    );
  }
  return NextResponse.json(updated);
}
