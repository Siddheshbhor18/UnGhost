import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  assignRecruiterToCompany,
  createCompany,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

const Input = z.object({
  recruiterId: z.string().min(1),
  // Either link to an existing company …
  companyId: z.string().min(1).optional(),
  // … or create a new one in the same call.
  newCompany: z
    .object({
      name: z.string().trim().min(2).max(120),
      domain: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "valid domain required")
        .max(120),
    })
    .optional(),
  makeAdmin: z.boolean().optional(),
});

/**
 * POST /api/admin/recruiters/assign
 *
 * Links a recruiter to a company — the missing "ops assigns you to a company"
 * onboarding step. Pass `companyId` for an existing company, or `newCompany`
 * to create one and link in the same request. Admin only.
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
  const { recruiterId, companyId, newCompany, makeAdmin } = parsed.data;

  if (!companyId && !newCompany) {
    return NextResponse.json(
      { error: "companyId_or_newCompany_required" },
      { status: 400 },
    );
  }

  let targetCompanyId = companyId;
  let createdCompanyName: string | undefined;
  if (newCompany) {
    const company = await createCompany({
      name: newCompany.name,
      domain: newCompany.domain,
    });
    targetCompanyId = company.id;
    createdCompanyName = company.name;
  }

  const res = await assignRecruiterToCompany(
    recruiterId,
    targetCompanyId!,
    makeAdmin ?? false,
  );
  if (!res.ok) {
    return NextResponse.json({ error: res.reason }, { status: 400 });
  }

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "recruiter.assign-company",
    targetType: "user",
    targetId: recruiterId,
    summary: `Admin linked recruiter ${recruiterId} to company ${targetCompanyId}${
      createdCompanyName ? ` (created "${createdCompanyName}")` : ""
    }${makeAdmin ? " as company admin" : ""}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, companyId: targetCompanyId });
}
