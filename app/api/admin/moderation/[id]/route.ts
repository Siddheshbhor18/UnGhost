import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  decideModerationFlag,
  writeAuditLog,
} from "@/server/store";
import type { ModerationDecision } from "@/shared/types";

export const runtime = "nodejs";

const DECISIONS: ModerationDecision[] = [
  "approved",
  "removed_warning",
  "removed_suspension",
  "escalated",
];

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
  const body = (await req.json().catch(() => null)) as {
    decision: ModerationDecision;
    decisionNote?: string;
  } | null;
  if (!body || !DECISIONS.includes(body.decision)) {
    return NextResponse.json({ error: "invalid decision" }, { status: 400 });
  }
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
