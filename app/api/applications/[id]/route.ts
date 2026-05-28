import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getApplicationById,
  updateApplicationFields,
} from "@/server/store";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const app = await getApplicationById(params.id);
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  // Student can only see own apps; recruiters / admins can see any
  if (session.user.role === "student" && app.studentId !== session.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(app);
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  const app = await getApplicationById(params.id);
  if (!app || app.studentId !== session.user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as {
    action?: "withdraw" | "request_update";
  };

  if (body.action === "withdraw") {
    if (["hired", "rejected"].includes(app.stage)) {
      return NextResponse.json(
        { error: "cannot withdraw from terminal stage" },
        { status: 409 },
      );
    }
    const updated = await updateApplicationFields(params.id, {
      stage: "rejected",
      withdrawnAt: new Date().toISOString(),
      outcomeNotes:
        (app.outcomeNotes ? `${app.outcomeNotes} · ` : "") +
        "Withdrawn by candidate",
    });
    return NextResponse.json(updated);
  }

  if (body.action === "request_update") {
    if (app.updateRequestedAt) {
      return NextResponse.json(
        { error: "update already requested for this application" },
        { status: 429 },
      );
    }
    const updated = await updateApplicationFields(params.id, {
      updateRequestedAt: new Date().toISOString(),
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
