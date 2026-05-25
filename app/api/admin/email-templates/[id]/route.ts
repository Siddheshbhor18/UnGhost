/**
 * PATCH /api/admin/email-templates/[id]
 *
 * Persist subject + body edits on an email template. Admin-only, audited.
 * The same template documents are read by the transactional email
 * helpers (sendVerifyEmail, sendPasswordReset, etc.) so edits affect the
 * live mail copy as soon as the next email is sent — no separate publish
 * step. Be careful what you change.
 *
 * Body must keep all `{{var}}` placeholders that the consuming helper
 * expects (lookup the row's `variables[]` array first if you're unsure).
 * We don't enforce that server-side; admin trust is sufficient for v1.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { updateEmailTemplate, writeAuditLog } from "@/server/store";
import { logger } from "@/server/lib/logger";

const patchSchema = z
  .object({
    subject: z.string().trim().min(1).max(200).optional(),
    body: z.string().trim().min(1).max(20000).optional(),
  })
  .refine(
    (v) => v.subject !== undefined || v.body !== undefined,
    "Provide subject and/or body",
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

  await updateEmailTemplate(params.id, {
    ...parsed.data,
    lastEditedByAdminId: session.user.id,
  });

  await writeAuditLog({
    actorId: session.user.id,
    actorRole: "admin",
    action: "email_template.updated",
    targetType: "email_template",
    targetId: params.id,
    summary: `Edited email template — fields: ${Object.keys(parsed.data).join(", ")}`,
  });

  logger.info(
    {
      templateId: params.id,
      adminId: session.user.id,
      fields: Object.keys(parsed.data),
    },
    "admin.email_template.updated",
  );

  return NextResponse.json({
    ok: true,
    lastEditedAt: new Date().toISOString(),
  });
}
