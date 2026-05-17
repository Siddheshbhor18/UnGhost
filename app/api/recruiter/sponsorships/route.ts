import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  createSponsorship,
  getBootcampById,
  getCompanyById,
  getUserById,
  listSponsorshipsByRecruiter,
  notify,
} from "@/server/store";

export const runtime = "nodejs";

interface InitiateBody {
  studentId: string;
  bootcampId: string;
  jobId?: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(await listSponsorshipsByRecruiter(session.user.id));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const body = (await req.json().catch(() => null)) as InitiateBody | null;
  if (!body?.studentId || !body.bootcampId) {
    return NextResponse.json(
      { error: "studentId and bootcampId required" },
      { status: 400 },
    );
  }
  const [recruiter, bootcamp, student] = await Promise.all([
    getUserById(session.user.id),
    getBootcampById(body.bootcampId),
    getUserById(body.studentId),
  ]);
  if (!bootcamp) {
    return NextResponse.json({ error: "bootcamp not found" }, { status: 404 });
  }
  if (!student || student.role !== "student") {
    return NextResponse.json({ error: "student not found" }, { status: 404 });
  }
  const company = recruiter?.companyId
    ? await getCompanyById(recruiter.companyId)
    : undefined;

  // Mock PhonePe payment: assume success. Real impl calls PhonePe initiate API.
  const sp = await createSponsorship({
    recruiterId: session.user.id,
    companyName: company?.name ?? recruiter?.name ?? "A company",
    studentId: body.studentId,
    bootcampId: body.bootcampId,
    jobId: body.jobId,
    pricePaid: bootcamp.priceINR,
  });

  // Notify the student
  await notify({
    userId: body.studentId,
    kind: "sponsorship_offered",
    priority: "high",
    title: `${sp.companyName} wants to sponsor your bootcamp`,
    body: `${bootcamp.title} — covers your ${bootcamp.skill} gap. 30 days to accept.`,
    link: "/dashboard",
    actorLabel: sp.companyName,
    actionRequired: true,
  });

  return NextResponse.json(sp, { status: 201 });
}
