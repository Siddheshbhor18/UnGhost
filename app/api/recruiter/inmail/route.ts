import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import {
  createInMail,
  getCompanyById,
  getInMailCredits,
  getJobById,
  getUserById,
  isInMailOnCooldown,
  listInMailsByRecruiter,
  notify,
  refundInMailCredit,
  spendInMailCredit,
} from "@/server/store";
import { isActiveUser } from "@/server/auth/account-status";
import { logger } from "@/server/lib/logger";
import { z } from "zod";
import { parseBody } from "@/server/lib/validate";
import {
  rateLimit,
  rateLimitResponse,
  identifierFromRequest,
} from "@/server/lib/rate-limit";

export const runtime = "nodejs";

const InMailInput = z.object({
  studentId: z.string().trim().min(1).max(64),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  jobId: z.string().trim().min(1).max(64).optional(),
});

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
  // Burst cap on top of the per-message credit + 90-day cooldown checks below.
  const rl = await rateLimit(
    "inmail.send",
    identifierFromRequest(req, session.user.id),
    { limit: 20, windowSec: 60 },
  );
  if (!rl.allowed) return rateLimitResponse(rl);
  const parsed = await parseBody(req, InMailInput);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  // Cooldown gate — check BEFORE spending a credit so a rejected send never
  // burns a credit.
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
  if (!recruiter || !isActiveUser(recruiter)) {
    return NextResponse.json({ error: "account_inactive" }, { status: 403 });
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

  // Atomic credit debit. `spendInMailCredit` returns `{ ok: false }` when
  // `inMailCredits` is 0 and only decrements when the gate matches — closes
  // the TOCTOU where a naive read-then-write let bursts of concurrent sends
  // each see a positive balance and decrement past zero.
  const spend = await spendInMailCredit(session.user.id);
  if (!spend.ok) {
    return NextResponse.json(
      { error: "out of InMail credits — contact admin" },
      { status: 402 },
    );
  }

  // Credit is already debited. If the InMail create throws (Mongo hiccup),
  // refund the credit before surfacing the error — never charge for a message
  // that didn't actually persist.
  let im;
  try {
    im = await createInMail({
      recruiterId: session.user.id,
      recruiterName: recruiter?.name ?? "Recruiter",
      companyName: company.name,
      studentId: body.studentId,
      jobId: body.jobId,
      jobTitle: job?.title,
      subject: body.subject,
      body: body.body,
    });
  } catch (err) {
    logger.error(
      { err, recruiterId: session.user.id },
      "inmail.create_failed_refunding_credit",
    );
    await refundInMailCredit(session.user.id).catch(() => {
      /* refund best-effort — logged for reconciliation */
    });
    return NextResponse.json(
      { error: "send_failed_try_again" },
      { status: 500 },
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

  return NextResponse.json({ inmail: im, creditsRemaining: spend.remaining });
}
