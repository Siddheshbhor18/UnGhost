import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import {
  banUser,
  getUserById,
  notify,
  restoreUser,
  setUserRole,
  suspendUser,
  writeAuditLog,
} from "@/server/store";
import type { Role } from "@/shared/types";

export const runtime = "nodejs";

// Roles an admin may assign via this tool. Admin is intentionally excluded —
// admin provisioning is script-only (scripts/create-admin.ts).
const ASSIGNABLE_ROLES = ["student", "recruiter", "instructor"] as const;

// One discriminated schema per action so each variant's required fields are
// enforced by the parser instead of the handler's if-ladder — a stray shape
// (e.g. `{ action: "ban" }` with no reason) 400s at the boundary now.
const Input = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("suspend"),
    reason: z.string().trim().min(10).max(500),
    durationDays: z.union([z.literal(7), z.literal(14), z.literal(30)]).default(7),
  }),
  z.object({
    action: z.literal("ban"),
    reason: z.string().trim().min(10).max(500),
  }),
  z.object({
    action: z.literal("restore"),
    reason: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("set_role"),
    role: z.enum(ASSIGNABLE_ROLES),
  }),
]);

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
  if (session.user.id === params.id) {
    return NextResponse.json(
      { error: "cannot act on your own admin account" },
      { status: 400 },
    );
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;
  const target = await getUserById(params.id);
  if (!target) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }
  if (target.role === "admin") {
    return NextResponse.json(
      { error: "cannot moderate another admin" },
      { status: 403 },
    );
  }

  if (body.action === "suspend") {
    if (!body.reason || body.reason.length < 10) {
      return NextResponse.json(
        { error: "reason required (≥10 chars)" },
        { status: 400 },
      );
    }
    const duration = body.durationDays ?? 7;
    if (![7, 14, 30].includes(duration)) {
      return NextResponse.json(
        { error: "durationDays must be 7, 14, or 30" },
        { status: 400 },
      );
    }
    const updated = await suspendUser({
      userId: params.id,
      durationDays: duration,
      reason: body.reason,
      byAdminId: session.user.id,
    });
    await writeAuditLog({
      actorId: session.user.id,
      actorRole: "admin",
      action: "user.suspend",
      targetType: "user",
      targetId: params.id,
      summary: `Suspended ${target.name} for ${duration} days`,
      before: { status: target.status ?? "active" },
      after: { status: "suspended", durationDays: duration },
      reason: body.reason,
    });
    await notify({
      userId: params.id,
      kind: "system",
      priority: "critical",
      title: `Your account has been suspended for ${duration} days`,
      body: body.reason,
      actorLabel: "unGhost Admin",
    });
    return NextResponse.json(updated);
  }

  if (body.action === "ban") {
    if (!body.reason || body.reason.length < 10) {
      return NextResponse.json(
        { error: "reason required (≥10 chars)" },
        { status: 400 },
      );
    }
    const updated = await banUser({
      userId: params.id,
      reason: body.reason,
      byAdminId: session.user.id,
    });
    await writeAuditLog({
      actorId: session.user.id,
      actorRole: "admin",
      action: "user.ban",
      targetType: "user",
      targetId: params.id,
      summary: `Banned ${target.name} permanently`,
      before: { status: target.status ?? "active" },
      after: { status: "banned" },
      reason: body.reason,
    });
    await notify({
      userId: params.id,
      kind: "system",
      priority: "critical",
      title: "Your account has been permanently banned",
      body: body.reason,
      actorLabel: "unGhost Admin",
    });
    return NextResponse.json(updated);
  }

  if (body.action === "set_role") {
    if (!body.role || !ASSIGNABLE_ROLES.includes(body.role)) {
      return NextResponse.json(
        { error: `role must be one of: ${ASSIGNABLE_ROLES.join(", ")}` },
        { status: 400 },
      );
    }
    const result = await setUserRole(params.id, body.role);
    if (!result.ok) {
      // is_admin / not_found / noop → 4xx with a clear reason.
      const status = result.reason === "not_found" ? 404 : 400;
      return NextResponse.json({ error: result.reason }, { status });
    }
    await writeAuditLog({
      actorId: session.user.id,
      actorRole: "admin",
      action: "user.set-role",
      targetType: "user",
      targetId: params.id,
      summary: `Changed ${target.name}'s role: ${target.role} → ${body.role}`,
      before: { role: target.role },
      after: { role: body.role },
    });
    await notify({
      userId: params.id,
      kind: "system",
      priority: "high",
      title: `Your account role is now ${body.role}`,
      body: "An admin updated your account type. Please sign in again to continue.",
      actorLabel: "unGhost Admin",
    });
    return NextResponse.json(result.user);
  }

  if (body.action === "restore") {
    const updated = await restoreUser(params.id);
    await writeAuditLog({
      actorId: session.user.id,
      actorRole: "admin",
      action: "user.restore",
      targetType: "user",
      targetId: params.id,
      summary: `Restored ${target.name}'s account`,
      before: { status: target.status ?? "suspended" },
      after: { status: "active" },
    });
    await notify({
      userId: params.id,
      kind: "system",
      priority: "high",
      title: "Your account has been restored",
      body: "You can sign back in immediately. Suspension lifted by admin.",
      actorLabel: "unGhost Admin",
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
