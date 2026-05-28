import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  banUser,
  getUserById,
  notify,
  restoreUser,
  suspendUser,
  writeAuditLog,
} from "@/server/store";

export const runtime = "nodejs";

type Action = "suspend" | "ban" | "restore";

interface Body {
  action: Action;
  durationDays?: number;
  reason?: string;
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
  if (session.user.id === params.id) {
    return NextResponse.json(
      { error: "cannot act on your own admin account" },
      { status: 400 },
    );
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }
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
