import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  getApplicationById,
  getJobById,
  notify,
  updateApplicationStage,
} from "@/server/store";
import type { Stage } from "@/shared/types";

export const runtime = "nodejs";

const STAGE_COPY: Record<
  Stage,
  { kind: "application_advanced" | "application_rejected" | "application_hired"; priority: "normal" | "high" | "critical"; title: (job: string) => string; body: (job: string) => string }
> = {
  new_matches: {
    kind: "application_advanced",
    priority: "normal",
    title: (j) => `New stage on ${j}`,
    body: () => "You're back at the matched stage.",
  },
  under_review: {
    kind: "application_advanced",
    priority: "normal",
    title: (j) => `Your ${j} application is under review`,
    body: () => "A recruiter has opened your submission.",
  },
  interview: {
    kind: "application_advanced",
    priority: "high",
    title: (j) => `Interview scheduled for ${j}`,
    body: () => "Check the application detail for prep notes + calendar invite.",
  },
  offer: {
    kind: "application_advanced",
    priority: "high",
    title: (j) => `Offer extended on ${j}`,
    body: () => "Final-stage outcome. Open the application detail to respond.",
  },
  hired: {
    kind: "application_hired",
    priority: "critical",
    title: (j) => `🎉 You got the role — ${j}`,
    body: () => "Final paperwork lands in your inbox.",
  },
  rejected: {
    kind: "application_rejected",
    priority: "normal",
    title: (j) => `Closed without advancing — ${j}`,
    body: () => "AI Coach has next-step recommendations on your dashboard.",
  },
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { stage, outcomeNotes } = await req.json();
  const app = await updateApplicationStage(params.id, stage as Stage, outcomeNotes);
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Notify the student of the stage transition.
  const job = await getJobById(app.jobId);
  const copy = STAGE_COPY[stage as Stage];
  if (copy && job) {
    await notify({
      userId: app.studentId,
      kind: copy.kind,
      priority: copy.priority,
      title: copy.title(job.title),
      body: copy.body(job.title),
      link: `/student/applications/${app.id}`,
      actionRequired: stage === "offer" || stage === "interview",
    });
  }

  return NextResponse.json(app);
}
