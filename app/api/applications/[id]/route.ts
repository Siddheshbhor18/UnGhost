import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import {
  getApplicationById,
  getJobById,
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

  // Ownership: a student sees only their own apps; a recruiter sees only apps
  // to their own jobs; admins see everything. Without the recruiter scope,
  // any recruiter could read any application by ID — candidate PII +
  // assessment responses leak across recruiters (IDOR).
  const role = session.user.role;
  if (role === "student") {
    if (app.studentId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (role === "recruiter") {
    const job = await getJobById(app.jobId);
    if (!job || job.recruiterId !== session.user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (role !== "admin") {
    // instructors / any other role have no business reading applications
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
  const parsed = await parseBody(
    req,
    z.object({ action: z.enum(["withdraw", "request_update"]) }),
  );
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

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
