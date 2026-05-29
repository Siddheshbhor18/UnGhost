import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import {
  createApplication,
  getJobById,
  getUserById,
  listApplicationsByStudent,
  notify,
} from "@/server/store";
import {
  APPLY_THRESHOLD,
  computeCompleteness,
} from "@/server/lib/profile-completeness";
import { checkApplyQuota, effectivePlan } from "@/server/lib/quota";
import { getAI } from "@/server/integrations/ai";

export const runtime = "nodejs";

const ApplyInput = z.object({
  jobId: z.string().min(1).max(64),
  response: z.string().max(10000).optional(),
  tabSwitches: z.number().int().min(0).max(1000).optional(),
  pasteAttempts: z.number().int().min(0).max(1000).optional(),
  timeTakenSec: z.number().min(0).max(86400).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json([], { status: 200 });
  if (session.user.role !== "student") return NextResponse.json([]);
  return NextResponse.json(await listApplicationsByStudent(session.user.id));
}

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "student") {
    return NextResponse.json({ error: "students only" }, { status: 403 });
  }
  const parsed = await parseBody(req, ApplyInput);
  if (!parsed.ok) return parsed.response;
  const b = parsed.data;
  const [job, user] = await Promise.all([
    getJobById(b.jobId),
    getUserById(session.user.id),
  ]);
  if (!job || !user?.profile) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  // PRD: students with thin profiles can't apply (noise for recruiters)
  const completeness = computeCompleteness(user);
  if (completeness.pct < APPLY_THRESHOLD) {
    return NextResponse.json(
      {
        error: "profile_incomplete",
        message: `Your profile is ${completeness.pct}% complete. Reach ${APPLY_THRESHOLD}% before applying.`,
        completeness: completeness.pct,
        threshold: APPLY_THRESHOLD,
        missing: completeness.missing,
      },
      { status: 403 },
    );
  }

  // Subscription gate — enforce per-plan application quota.
  const quota = await checkApplyQuota(user);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "quota_exceeded",
        plan: effectivePlan(user),
        reason: quota.reason,
        cap: quota.cap,
        remaining: quota.remaining,
        windowKind: quota.windowKind,
        message:
          quota.reason === "trial_exhausted"
            ? `You've used all ${quota.cap} free applications. Go Premium for unlimited applications.`
            : `You've used all ${quota.cap} applications for this window. Go Premium for unlimited, or wait for the window to refresh.`,
      },
      { status: 402 },
    );
  }
  const ai = getAI();
  const match = await ai.matchScore(user.profile, job);
  const grade = b.response
    ? await ai.gradeAssessment(job.gauntletPrompt, b.response, job)
    : undefined;

  // Integrity score: 100 minus PRD penalties for tab switches, paste attempts, speed
  const tabSwitches = Number(b.tabSwitches ?? 0);
  const pasteAttempts = Number(b.pasteAttempts ?? 0);
  const timeTakenSec = Number(b.timeTakenSec ?? 600);
  const tooFast = timeTakenSec < 60; // suspiciously fast
  const integrityScore = Math.max(
    0,
    100 -
      tabSwitches * 10 -
      pasteAttempts * 15 -
      (tooFast ? 20 : 0),
  );
  const integrityFlags: string[] = [];
  if (tabSwitches >= 3) integrityFlags.push("multiple tab switches");
  if (pasteAttempts > 0) integrityFlags.push("paste attempted");
  if (tooFast) integrityFlags.push("suspiciously fast submission");

  const passed =
    grade && grade.verdict !== "reject" && grade.score >= 55;

  const app = await createApplication({
    jobId: job.id,
    studentId: user.id,
    matchPct: match.matchPct,
    assessment: b.response
      ? {
          prompt: job.gauntletPrompt,
          response: b.response,
          submittedAt: new Date().toISOString(),
          grade,
          integrityScore,
          integrityFlags,
        }
      : undefined,
  });
  // Notify student of grading outcome
  if (grade) {
    await notify({
      userId: user.id,
      kind: "application_graded",
      priority: passed ? "normal" : "high",
      title: passed
        ? `Assessment graded · ${grade.score}/100`
        : `Assessment didn't pass · ${grade.score}/100`,
      body: passed
        ? `Submitted to ${job.title}. Recruiter has the SLA clock ticking.`
        : "The Path Forward has bootcamp recs to close the gap before your next attempt.",
      link: `/student/applications/${app.id}`,
    });
    // Notify recruiter of new application
    if (job.recruiterId) {
      await notify({
        userId: job.recruiterId,
        kind: "application_graded",
        priority: passed ? "high" : "normal",
        title: `New ${grade.verdict === "advance" ? "Tier A" : grade.verdict === "borderline" ? "Tier B" : "Tier C"} applicant`,
        body: `${user.name} submitted for ${job.title} · ${grade.score}/100`,
        link: "/recruiter/command",
        actorLabel: user.name,
        actionRequired: passed,
      });
    }
  }

  return NextResponse.json(
    { ...app, passed, studentSkills: user.profile.skills },
    { status: 201 },
  );
}
