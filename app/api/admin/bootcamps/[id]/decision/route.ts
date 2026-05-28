import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getBootcampById,
  notify,
  setBootcampStatus,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

type Decision = "approve" | "request_changes" | "archive";

interface Body {
  decision: Decision;
  reviewFeedback?: string;
}

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
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.decision) {
    return NextResponse.json({ error: "decision required" }, { status: 400 });
  }
  const bc = await getBootcampById(params.id);
  if (!bc) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let notifyKind: "system" = "system";
  let title = "";
  let bodyCopy = "";

  if (body.decision === "approve") {
    if (bc.status !== "in_review") {
      return NextResponse.json(
        { error: `cannot approve a bootcamp in status ${bc.status}` },
        { status: 409 },
      );
    }
    await setBootcampStatus(params.id, "published");
    title = "Bootcamp approved — now live";
    bodyCopy = `"${bc.title}" is now in the public catalogue. Students can enroll.`;
  } else if (body.decision === "request_changes") {
    if (!body.reviewFeedback || body.reviewFeedback.trim().length < 20) {
      return NextResponse.json(
        { error: "reviewFeedback required (≥20 chars)" },
        { status: 400 },
      );
    }
    await setBootcampStatus(params.id, "changes_requested", {
      reviewFeedback: body.reviewFeedback.trim(),
    });
    title = "Bootcamp needs changes before publishing";
    bodyCopy = body.reviewFeedback.trim().slice(0, 160);
  } else if (body.decision === "archive") {
    await setBootcampStatus(params.id, "archived");
    title = "Bootcamp archived";
    bodyCopy = `"${bc.title}" has been archived. Contact admin to restore.`;
  } else {
    return NextResponse.json({ error: "unknown decision" }, { status: 400 });
  }

  // Audit + notify
  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: `bootcamp.${body.decision}`,
    targetType: "bootcamp",
    targetId: bc.id,
    summary: `${body.decision.replace("_", " ")}: ${bc.title}`,
    before: { status: bc.status ?? "in_review" },
    after: {
      status:
        body.decision === "approve"
          ? "published"
          : body.decision === "request_changes"
          ? "changes_requested"
          : "archived",
    },
    reason: body.reviewFeedback,
  });
  await notify({
    userId: bc.instructorId,
    kind: notifyKind,
    priority: body.decision === "approve" ? "high" : "normal",
    title,
    body: bodyCopy,
    link: `/instructor/studio/${bc.id}`,
    actorLabel: "Admin review",
  });

  return NextResponse.json({ ok: true, decision: body.decision });
}
