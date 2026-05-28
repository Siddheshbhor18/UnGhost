/**
 * POST /api/admin/payment-submissions/[id]/reject
 *
 * Admin rejects a student's QR-payment submission. Effect:
 *   1. Submission.status → 'rejected' (with reviewedBy, reviewedAt, reason).
 *   2. Bootcamp.currentSubmissionCount -= 1 (free the seat — they're not
 *      taking it). Capacity is now available for another student.
 *
 * Both writes inside a transaction so the counter never decrements
 * without a status flip, and vice versa.
 *
 * Reason is REQUIRED on reject — it gets included in the rejection email
 * so the student knows what to fix (e.g. "wrong UTR", "amount mismatch").
 *
 * After commit: fires `sendEnrollmentRejected` email with the reason.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import {
  BootcampModel,
  PaymentSubmissionModel,
  UserModel,
} from "@/server/db/models";
import { sendEnrollmentRejected } from "@/server/integrations/email";
import { logger } from "@/server/lib/logger";
import { adminLoadSubmission } from "../_shared";

const inputSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Reason must be at least 3 characters")
    .max(280, "Reason must be under 280 characters"),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
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

  const guard = await adminLoadSubmission(params.id, req);
  if (guard.errorResponse) return guard.errorResponse;
  const { adminUserId, submission } = guard;
  if (!submission || !adminUserId) {
    return NextResponse.json({ error: "Guard failed" }, { status: 500 });
  }

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      submission.status = "rejected";
      submission.reviewedBy = adminUserId;
      submission.reviewedAt = new Date();
      submission.rejectionReason = parsed.data.reason;
      await submission.save({ session: dbSession });

      // Free the seat — the student is no longer holding it.
      // Plan purchases (bootcampId = "plan:pro" etc.) don't have a real
      // bootcamp document, so skip the decrement to avoid corrupting counters.
      if (!submission.bootcampId.startsWith("plan:")) {
        await BootcampModel.updateOne(
          { _id: submission.bootcampId },
          { $inc: { currentSubmissionCount: -1 } },
          { session: dbSession },
        );
      }
    });
  } catch (err) {
    logger.error(
      { err, submissionId: params.id },
      "admin.reject.transaction_failed",
    );
    return NextResponse.json(
      { error: "Rejection failed — please try again" },
      { status: 500 },
    );
  } finally {
    dbSession.endSession();
  }

  try {
    const user = await UserModel.findById(submission.userId)
      .select("name email")
      .lean();
    const bootcamp = await BootcampModel.findById(submission.bootcampId)
      .select("title")
      .lean();
    if (user?.email) {
      sendEnrollmentRejected(user.email, {
        name: user.name ?? "Student",
        bootcampTitle: bootcamp?.title ?? "your bootcamp",
        reason: parsed.data.reason,
      }).catch((emailErr: unknown) =>
        logger.error(
          { err: emailErr, submissionId: params.id },
          "admin.reject.email_failed",
        ),
      );
    }
  } catch (err) {
    logger.error(
      { err, submissionId: params.id },
      "admin.reject.email_lookup_failed",
    );
  }

  logger.info(
    {
      submissionId: params.id,
      adminUserId,
      reason: parsed.data.reason,
    },
    "admin.reject.success",
  );

  return NextResponse.json({ status: "rejected" });
}
