import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getUserById,
  notify,
  removeRecruiterFromCompany,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

/** DELETE = remove recruiter from company. Caller must be Company Admin of same company. */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const csrf = requireSameOrigin(_req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const me = await getUserById(session.user.id);
  if (!me?.isCompanyAdmin) {
    return NextResponse.json(
      { error: "Company Admin only" },
      { status: 403 },
    );
  }
  if (me.id === params.id) {
    return NextResponse.json(
      { error: "cannot remove yourself" },
      { status: 400 },
    );
  }
  const target = await getUserById(params.id);
  if (!target || target.companyId !== me.companyId) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await removeRecruiterFromCompany(params.id);
  await writeAuditLog({
    actorId: me.id,
    actorRole: "recruiter",
    action: "team.remove_recruiter",
    targetType: "user",
    targetId: params.id,
    summary: `Removed ${target.name} from company`,
    before: { companyId: target.companyId },
    after: { companyId: null },
  });
  await notify({
    userId: params.id,
    kind: "system",
    priority: "high",
    title: "You've been removed from your company",
    body: "Contact your Company Admin if this was unintentional.",
    actorLabel: me.name,
  });
  return NextResponse.json({ ok: true });
}
