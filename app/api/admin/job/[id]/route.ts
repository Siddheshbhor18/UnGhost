import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { parseBody } from "@/server/lib/validate";
import { requireSameOrigin } from "@/server/lib/csrf";
import { setJobActive, writeAuditLog } from "@/server/store";

export const runtime = "nodejs";

interface Ctx {
  params: { id: string };
}

const Input = z.object({
  action: z.enum(["close", "reopen"]),
  reason: z.string().max(500).optional(),
});

/** PATCH { action: "close"|"reopen", reason? } */
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
  await setJobActive(params.id, action === "reopen");
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: `job.${action}`,
    targetType: "job",
    targetId: params.id,
    summary: `Admin ${action} on job ${params.id}${reason ? `: ${reason}` : ""}`,
    reason,
  });
  return NextResponse.json({ ok: true });
}
