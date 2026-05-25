/**
 * PATCH /api/admin/support/[id]
 *
 * Update a support ticket's status, priority, or assignee. Admin-only.
 *
 * Audited via writeAuditLog so the support history shows who flipped
 * what when. Triage actions live exclusively through this endpoint —
 * the client no longer maintains parallel useState of ticket status.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import {
  getSupportTicketById,
  getUserByEmail,
  notify,
  updateSupportTicket,
  writeAuditLog,
} from "@/server/store";
import { logger } from "@/server/lib/logger";

const patchSchema = z
  .object({
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    // Empty string clears the assignment. Server normalises below.
    assignedToAdminId: z.string().trim().max(64).optional(),
  })
  .refine(
    (v) => Object.keys(v).length > 0,
    "Provide at least one field to update",
  );

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  // Empty-string assignee → undefined → "unassign" semantically.
  const patch: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.assignedToAdminId === "") {
    patch.assignedToAdminId = undefined;
  }

  // Pull the existing ticket so we can:
  //   1. Detect a status transition (to gate the notification)
  //   2. Find the requester to notify
  // updateSupportTicket doesn't return the previous state, so we fetch first.
  const before = await getSupportTicketById(params.id);
  if (!before) {
    return NextResponse.json({ error: "ticket_not_found" }, { status: 404 });
  }

  await updateSupportTicket(params.id, patch);

  const summary = [
    parsed.data.status ? `status=${parsed.data.status}` : null,
    parsed.data.priority ? `priority=${parsed.data.priority}` : null,
    parsed.data.assignedToAdminId !== undefined
      ? `assignee=${parsed.data.assignedToAdminId || "(unassigned)"}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "support.updated",
    targetType: "support_ticket",
    targetId: params.id,
    summary: `Support ticket ${params.id} updated — ${summary}`,
  });

  // Notify the requester ONLY on status transitions worth surfacing —
  // priority/assignee changes are admin-internal and don't help the
  // requester. We fire on resolved + closed (closure clarity) and on
  // any reopen (their reply was heard).
  const statusChanged =
    parsed.data.status !== undefined && parsed.data.status !== before.status;
  if (statusChanged) {
    const requester = await getUserByEmail(before.requesterEmail);
    if (requester?.id) {
      const newStatus = parsed.data.status!;
      const copyByStatus: Record<string, { title: string; body: string }> = {
        in_progress: {
          title: "Support is on it",
          body: `Your ticket "${before.subject}" is being looked at.`,
        },
        resolved: {
          title: "Support ticket resolved",
          body: `We've marked "${before.subject}" as resolved. Reply if anything's still off.`,
        },
        closed: {
          title: "Support ticket closed",
          body: `"${before.subject}" was closed. Reopen by replying to the original email.`,
        },
        open: {
          title: "Support ticket reopened",
          body: `Your ticket "${before.subject}" is open again — we'll be in touch.`,
        },
      };
      const copy = copyByStatus[newStatus];
      if (copy) {
        await notify({
          userId: requester.id,
          kind: "system",
          priority: newStatus === "resolved" ? "normal" : "low",
          title: copy.title,
          body: copy.body,
          link: "/notifications",
        });
      }
    }
  }

  logger.info(
    {
      ticketId: params.id,
      adminId: session.user.id,
      patch: Object.keys(parsed.data),
    },
    "admin.support.updated",
  );

  return NextResponse.json({
    ok: true,
    updatedAt: new Date().toISOString(),
  });
}
