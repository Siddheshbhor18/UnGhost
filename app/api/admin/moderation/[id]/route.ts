import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { decideModerationFlag, writeAuditLog } from "@/server/store";

export const runtime = "nodejs";

const Input = z.object({
  decision: z.enum([
    "approved",
    "removed_warning",
    "removed_suspension",
    "escalated",
  ]),
  decisionNote: z.string().trim().max(2000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "admins only" }, { status: 403 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const flag = await decideModerationFlag(
    params.id,
    body.decision,
    session.user.id,
    body.decisionNote,
  );
  if (!flag) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: `moderation.${body.decision}`,
    targetType: "system",
    targetId: flag.id,
    summary: `Moderation flag ${flag.targetLabel}: ${body.decision.replace(/_/g, " ")}`,
    after: { decision: body.decision },
    reason: body.decisionNote,
  });
  return NextResponse.json(flag);
}
