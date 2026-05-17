import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { setCompanyStatus, setCompanyVerified, writeAuditLog } from "@/server/store";
import type { CompanyStatus } from "@/shared/types";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

const Input = z.object({
  action: z.enum(["verify", "unverify", "flag", "suspend", "unsuspend"]),
  reason: z.string().max(500).optional(),
});

/**
 * PATCH { action: "verify"|"unverify"|"flag"|"suspend"|"unsuspend", reason? }
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const { action, reason } = parsed.data;

  if (action === "verify" || action === "unverify") {
    await setCompanyVerified(params.id, action === "verify");
  } else {
    const map: Record<string, CompanyStatus> = {
      flag: "flagged",
      suspend: "suspended",
      unsuspend: "active",
    };
    await setCompanyStatus(params.id, map[action], reason);
  }
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: `company.${action}`,
    targetType: "company",
    targetId: params.id,
    summary: `Admin ${action} on company ${params.id}${reason ? `: ${reason}` : ""}`,
    reason,
  });
  return NextResponse.json({ ok: true });
}
