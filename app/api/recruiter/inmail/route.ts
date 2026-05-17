import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
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

  // Spend 1 credit
  await adjustInMailCredits(session.user.id, -1);

  const im = await createInMail({
    recruiterId: session.user.id,
    recruiterName: recruiter?.name ?? "Recruiter",
    companyName: company?.name ?? "A company",
    studentId: body.studentId,
    jobId: body.jobId,
    jobTitle: job?.title,
    subject: body.subject,
    body: body.body,
  });

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

  return NextResponse.json({ inmail: im, creditsRemaining: credits - 1 });
}
