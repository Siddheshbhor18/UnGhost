import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  adjustInMailCredits,
  createInMail,
  getCompanyById,
  getInMailCredits,
  getJobById,
  getUserById,
  isInMailOnCooldown,
  listInMailsByRecruiter,
  notify,
} from "@/server/store";
import { logger } from "@/server/lib/logger";

export const runtime = "nodejs";

interface Body {
  studentId: string;
  subject: string;
  body: string;
  jobId?: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const [sent, credits] = await Promise.all([
    listInMailsByRecruiter(session.user.id),
    getInMailCredits(session.user.id),
  ]);
  return NextResponse.json({ sent, credits });
}

export async function POST(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.studentId || !body.subject || !body.body) {
    return NextResponse.json(
      { error: "studentId, subject and body are required" },
      { status: 400 },
    );
  }
  const credits = await getInMailCredits(session.user.id);
  if (credits <= 0) {
    return NextResponse.json(
      { error: "out of InMail credits — contact admin" },
      { status: 402 },
    );
  }
  if (await isInMailOnCooldown(session.user.id, body.studentId)) {
    return NextResponse.json(
      {
        error:
          "this candidate declined/ignored you in the last 90 days · cooldown active",
      },
      { status: 409 },
    );
  }
  const [recruiter, student, job] = await Promise.all([
    getUserById(session.user.id),
    getUserById(body.studentId),
    body.jobId ? getJobById(body.jobId) : Promise.resolve(undefined),
  ]);
  if (!student || student.role !== "student") {
    return NextResponse.json(
      { error: "candidate not found" },
      { status: 404 },
    );
  }
  const company = recruiter?.companyId
    ? await getCompanyById(recruiter.companyId)
    : undefined;

  // R2 — a recruiter with no company can't reach out as "A company". Block
  // until an admin links them (matches the job-posting "no company" gate).
  if (!company) {
    return NextResponse.json(
      {
        error: "no_company",
        message:
          "Link your account to a company before sending InMail. Contact ops to get assigned.",
      },
      { status: 403 },
    );
  }

  // Create the InMail FIRST, then charge — so a failed send can never burn a
  // paid credit (credits were pre-checked > 0 above).
  const im = await createInMail({
    recruiterId: session.user.id,
    recruiterName: recruiter?.name ?? "Recruiter",
    companyName: company.name,
    studentId: body.studentId,
    jobId: body.jobId,
    jobTitle: job?.title,
    subject: body.subject,
    body: body.body,
  });

  // Spend 1 credit. The InMail is already persisted, so if the charge throws
  // we don't fail the request (favours the recruiter over losing the message);
  // log it for reconciliation instead.
  let creditsRemaining = credits - 1;
  try {
    creditsRemaining = await adjustInMailCredits(session.user.id, -1);
  } catch (err) {
    logger.error(
      { err, recruiterId: session.user.id, inMailId: im.id },
      "inmail.charge_failed",
    );
  }

  await notify({
    userId: body.studentId,
    kind: "inmail_received",
    priority: "high",
    title: `${im.companyName} wants to chat`,
    body: im.subject,
    link: "/dashboard",
    actorLabel: im.recruiterName,
    actionRequired: true,
  });

  return NextResponse.json({ inmail: im, creditsRemaining });
}
