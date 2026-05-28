/**
 * POST /api/enrollments
 *
 * Student submits a QR-payment claim for a bootcamp. Server:
 *   1. Authenticates the session (must be a logged-in student).
 *   2. Rate-limits per IP (5 req/min) — DOS protection.
 *   3. Checks Idempotency-Key cache — return stored result if retry.
 *   4. Validates input with Zod (UTR format, mobile format, etc).
 *   5. Looks up the bootcamp + verifies enrollment window is open.
 *   6. Atomically increments `currentSubmissionCount` ONLY IF under cap.
 *      This is the capacity gate — race-safe at the DB level, no transaction.
 *   7. Computes the expected total via `computeTotalPaise()` (single source).
 *   8. Inserts the PaymentSubmission. Partial-unique index on
 *      (userId, bootcampId) filtered to active statuses rejects dupes.
 *   9. Stores the result in the idempotency cache (24h TTL).
 *  10. Fires `sendPaymentReceived` email (non-blocking).
 *  11. Returns { id, status, message }.
 *
 * Failure paths:
 *   • Auth → 401
 *   • Rate limit → 429 with Retry-After
 *   • Validation → 400
 *   • Bootcamp not found / closed → 404 / 400
 *   • Capacity full → 400 "This bootcamp is full"
 *   • Duplicate active submission → 409 (caught from index violation)
 *   • Anything else → 500
 *
 * Email failure is silently logged — does NOT fail the submission. Student's
 * submission is the source of truth, not the notification.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/server/auth";
import { requireSameOrigin } from "@/server/lib/csrf";
import { connectMongo } from "@/server/db/mongo";
import { BootcampModel, PaymentSubmissionModel } from "@/server/db/models";
import { computeTotalPaise } from "@/server/payments/pricing";
import { clientIp, enforceRateLimit } from "@/server/lib/ratelimit";
import {
  getIdempotentResult,
  readIdempotencyKey,
  storeIdempotentResult,
} from "@/server/lib/idempotency";
import { sendPaymentReceived } from "@/server/integrations/email";
import { logger } from "@/server/lib/logger";
import { randomUUID } from "crypto";

const inputSchema = z.object({
  bootcampId: z.string().min(1),
  // UTR = UPI Transaction Reference. 12 alphanumeric chars across all UPI
  // apps. Normalise to uppercase server-side too (defence in depth) — the
  // schema also marks the field uppercase: true.
  utr: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{12}$/, "UTR must be 12 alphanumeric characters"),
  upiApp: z.enum(["phonepe", "gpay", "paytm", "bhim", "other"]),
  payerMobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
});

interface SubmitResult {
  id: string;
  status: "pending_verification" | "approved" | "rejected" | "flagged";
  message: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const csrf = requireSameOrigin(request);
  if (csrf) return csrf;
  // 1. Auth
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Rate limit (5 req/min/IP) — DOS protection, not a fraud control.
  const ip = clientIp(request);
  const limit = await enforceRateLimit({
    key: `enroll:${ip}`,
    max: 5,
    windowSec: 60,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      {
        status: 429,
        headers: {
          "Retry-After": String(limit.resetInSec),
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // 3. Idempotency-Key — replay protection on flaky networks
  const idempotencyKey = readIdempotencyKey(request);
  const cached = await getIdempotentResult<SubmitResult>(
    "enroll",
    userId,
    idempotencyKey,
  );
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  // 4. Validate
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  await connectMongo();

  // 5. Find bootcamp, enforce window
  const bootcamp = await BootcampModel.findOne({
    _id: parsed.data.bootcampId,
  }).lean();
  if (!bootcamp) {
    return NextResponse.json({ error: "Bootcamp not found" }, { status: 404 });
  }
  // Shared Bootcamp type declares these as `string | null` (ISO), but the
  // Mongo schema stores them as Date. .lean() returns the raw Date, so
  // wrap in `new Date(...)` defensively to compare regardless of shape.
  const now = Date.now();
  if (
    bootcamp.enrollmentOpensAt &&
    now < new Date(bootcamp.enrollmentOpensAt as Date | string).getTime()
  ) {
    return NextResponse.json(
      { error: "Enrollment hasn't opened yet for this bootcamp." },
      { status: 400 },
    );
  }
  if (
    bootcamp.enrollmentClosesAt &&
    now > new Date(bootcamp.enrollmentClosesAt as Date | string).getTime()
  ) {
    return NextResponse.json(
      { error: "Enrollment window has closed for this bootcamp." },
      { status: 400 },
    );
  }

  // 6. ATOMIC capacity check. findOneAndUpdate is race-safe at the DB level.
  // Bumps the counter only if we're under the cap. No counter bump = full.
  const reserved = await BootcampModel.findOneAndUpdate(
    {
      _id: parsed.data.bootcampId,
      $expr: { $lt: ["$currentSubmissionCount", "$maxStudents"] },
    },
    { $inc: { currentSubmissionCount: 1 } },
    { new: true },
  );
  if (!reserved) {
    return NextResponse.json(
      { error: "This bootcamp is full. No seats left." },
      { status: 400 },
    );
  }

  // 7. Compute the expected total — locked onto the submission so a
  //    later price change doesn't retroactively invalidate this UTR.
  const { totalInPaise } = computeTotalPaise({
    priceInPaise: bootcamp.priceInPaise ?? 0,
    gstPercent: bootcamp.gstPercent ?? 18,
  });

  // 8. Insert submission. If the partial-unique (userId, bootcampId)
  //    filtered to active statuses fires, the student already has a
  //    pending/approved submission for this bootcamp → 409 + rollback
  //    the counter bump we just did.
  const submissionId = `ps_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  try {
    await PaymentSubmissionModel.create({
      _id: submissionId,
      userId,
      bootcampId: parsed.data.bootcampId,
      expectedAmountInPaise: totalInPaise,
      utr: parsed.data.utr,
      upiApp: parsed.data.upiApp,
      payerMobile: parsed.data.payerMobile,
      status: "pending_verification",
      idempotencyKey,
    });
  } catch (err: unknown) {
    // Roll back the counter bump so the seat goes back to the pool.
    await BootcampModel.updateOne(
      { _id: parsed.data.bootcampId },
      { $inc: { currentSubmissionCount: -1 } },
    );
    // E11000 = MongoServerError duplicate key. Surface a friendly message.
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      return NextResponse.json(
        {
          error:
            "You already have a pending or approved submission for this bootcamp.",
        },
        { status: 409 },
      );
    }
    logger.error({ err, userId, bootcampId: parsed.data.bootcampId }, "enroll.create_failed");
    return NextResponse.json(
      { error: "Couldn't record your submission. Please try again." },
      { status: 500 },
    );
  }

  const result: SubmitResult = {
    id: submissionId,
    status: "pending_verification",
    message:
      "Payment details received. Your account will be activated within ~20 minutes.",
  };

  // 9. Cache for retry (24h)
  await storeIdempotentResult("enroll", userId, idempotencyKey, result);

  // 10. Fire confirmation email — non-blocking, log + ignore failures
  if (session.user.email) {
    sendPaymentReceived(session.user.email, {
      name: session.user.name ?? "Student",
      bootcampTitle: bootcamp.title ?? "your bootcamp",
      utr: parsed.data.utr,
    }).catch((err: unknown) =>
      logger.error({ err, submissionId }, "enroll.email_failed"),
    );
  }

  logger.info(
    { submissionId, userId, bootcampId: parsed.data.bootcampId },
    "enroll.submission_created",
  );

  return NextResponse.json(result, { status: 201 });
}
