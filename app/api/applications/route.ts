import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createApplication,
  getJobById,
  getUserById,
  listApplicationsByStudent,
} from "@/lib/data/store";
import { getAI } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 200 });
  if (session.user.role !== "student") return NextResponse.json([]);
  return NextResponse.json(listApplicationsByStudent(session.user.id));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  const b = await req.json();
  const job = getJobById(b.jobId);
  const user = getUserById(session.user.id);
  if (!job || !user?.profile) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const ai = getAI();
  const match = await ai.matchScore(user.profile, job);
  const grade = b.response
    ? await ai.gradeAssessment(job.gauntletPrompt, b.response, job)
    : undefined;
  const app = createApplication({
    jobId: job.id,
    studentId: user.id,
    matchPct: match.matchPct,
    assessment: b.response
      ? {
          prompt: job.gauntletPrompt,
          response: b.response,
          submittedAt: new Date().toISOString(),
          grade,
        }
      : undefined,
  });
  return NextResponse.json(app, { status: 201 });
}
