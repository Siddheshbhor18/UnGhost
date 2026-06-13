import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getUserById,
  removeRecruiterFromCompany,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

const Input = z.object({ recruiterId: z.string().min(1) });

/**
 * POST /api/admin/recruiters/unlink — admin removes a recruiter from their
 * company (clears companyId + the company roster). The account stays active
 * but can no longer post jobs until re-assigned. Admin only.
 */
export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;

  const recruiter = await getUserById(parsed.data.recruiterId);
  if (!recruiter || recruiter.role !== "recruiter") {
    return NextResponse.json({ error: "not_a_recruiter" }, { status: 404 });
  }
  const fromCompanyId = recruiter.companyId;
  await removeRecruiterFromCompany(parsed.data.recruiterId);

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "recruiter.unlink-company",
    targetType: "user",
    targetId: parsed.data.recruiterId,
    summary: `Admin removed recruiter ${parsed.data.recruiterId} from company ${fromCompanyId ?? "(none)"}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
