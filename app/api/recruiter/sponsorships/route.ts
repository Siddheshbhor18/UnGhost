import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import {
  createSponsorship,
  getBootcampById,
  getCompanyById,
  getUserById,
  listSponsorshipsByRecruiter,
} from "@/server/store";
import { requireSameOrigin } from "@/server/lib/csrf";
import { parseBody } from "@/server/lib/validate";
import { withApiErrorTracking } from "@/server/lib/api-error";
import { withRateLimit } from "@/server/lib/with-rate-limit";
import { createPayment, paymentsMode } from "@/server/integrations/payments";

export const runtime = "nodejs";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const Input = z.object({
  studentId: z.string().min(1).max(64),
  bootcampId: z.string().min(1).max(64),
  jobId: z.string().min(1).max(64).optional(),
});

async function getHandler() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(await listSponsorshipsByRecruiter(session.user.id));
}
export const GET = withApiErrorTracking(getHandler);

/**
 * POST — initiate a sponsorship.
 *
 * The sponsorship is created in `payment_pending` status with an id that
 * doubles as the PhonePe order id (so the callback can locate it). The
 * student is NOT notified until /api/recruiter/sponsorships/callback flips
 * the status to `offered` after the payment confirms.
 */
async function postHandler(req: Request) {
  const csrf = requireSameOrigin(req);
  if (csrf) return csrf;

  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "recruiter") {
    return NextResponse.json({ error: "recruiters only" }, { status: 403 });
  }
  const parsed = await parseBody(req, Input);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

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

  // Mint an order id we can route back to this sponsorship in the callback.
  // Format: `spons_<bootcampId>_<studentId>_<recruiterId>_<ts>`. Note: the
  // sponsorship's own row id IS the order id, so the callback only needs to
  // look it up by id.
  const orderId = `spons_${body.bootcampId}_${body.studentId}_${session.user.id}_${Date.now()}`;
  const redirectUrl = `${APP_URL}/api/recruiter/sponsorships/callback?orderId=${orderId}`;

  const sp = await createSponsorship({
    recruiterId: session.user.id,
    companyName: company?.name ?? recruiter?.name ?? "A company",
    studentId: body.studentId,
    bootcampId: body.bootcampId,
    jobId: body.jobId,
    pricePaid: bootcamp.priceINR,
    pendingPayment: true,
    forcedId: orderId,
  });

  const payment = await createPayment({
    orderId,
    amountPaise: bootcamp.priceINR * 100,
    description: `Sponsorship: ${bootcamp.title} for ${student.name}`,
    redirectUrl,
    payerPhone: recruiter?.profile?.contactPhone,
  });

  if (!payment.ok || !payment.redirectUrl) {
    return NextResponse.json(
      { error: "payment_init_failed", reason: payment.error, sponsorship: sp },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      sponsorship: sp,
      redirectUrl: payment.redirectUrl,
      providerTxnId: payment.providerTxnId,
      mode: paymentsMode(),
    },
    { status: 201 },
  );
}

// 20 sponsorship initiations / hour / recruiter — generous, but enough to
// catch a bug or abuse loop.
export const POST = withRateLimit(
  { bucket: "sponsorship.initiate", limit: 20, windowSec: 3600, by: "user" },
  withApiErrorTracking(postHandler),
);
