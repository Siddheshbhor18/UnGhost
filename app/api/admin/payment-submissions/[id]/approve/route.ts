/**
 * POST /api/admin/payment-submissions/[id]/approve
 *
 * Admin approves a student's QR-payment submission. Effect:
 *   1. Submission.status → 'approved' (with reviewedBy + reviewedAt).
 *   2. Bootcamp.enrolledStudentIds += userId (idempotent via $addToSet).
 *   3. User.studentProfile.enrolledBootcamps += bootcampId ($addToSet).
 *
 * All three writes happen inside a Mongoose transaction so a partial
 * failure can't leave the data in an inconsistent state (e.g. student
 * marked enrolled but bootcamp roster missing them).
 *
 * `currentSubmissionCount` on the bootcamp is NOT changed — the slot was
 * counted at submit time and the student is taking it.
 *
 * After the transaction commits, fires the approval email (non-blocking).
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import {
  BootcampModel,
  PaymentSubmissionModel,
  UserModel,
} from "@/server/db/models";
import { sendEnrollmentApproved } from "@/server/integrations/email";
import { logger } from "@/server/lib/logger";
import { adminLoadSubmission } from "../_shared";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const guard = await adminLoadSubmission(params.id);
  if (guard.errorResponse) return guard.errorResponse;
  const { adminUserId, submission } = guard;
  if (!submission || !adminUserId) {
    return NextResponse.json({ error: "Guard failed" }, { status: 500 });
  }

  // Run the three writes in a transaction so they're atomic.
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      submission.status = "approved";
      submission.reviewedBy = adminUserId;
      submission.reviewedAt = new Date();
      await submission.save({ session: dbSession });

      await BootcampModel.updateOne(
        { _id: submission.bootcampId },
        { $addToSet: { enrolledStudentIds: submission.userId } },
        { session: dbSession },
      );

      // User.profile.enrolledBootcamps — `profile` is the student subdoc
      // field name in UserSchema (NOT "studentProfile"). Strict mode
      // silently drops writes to unknown paths, so the typo would fail
      // silently; verified field name against server/db/models.ts.
      await UserModel.updateOne(
        { _id: submission.userId },
        {
          $addToSet: {
            "profile.enrolledBootcamps": submission.bootcampId,
          },
        },
        { session: dbSession },
      );
    });
  } catch (err) {
    logger.error(
      { err, submissionId: params.id },
      "admin.approve.transaction_failed",
    );
    return NextResponse.json(
      { error: "Approval failed — please try again" },
      { status: 500 },
    );
  } finally {
    dbSession.endSession();
  }

  // Notify the student. Fire-and-forget — email failure doesn't roll back
  // the approval. We log it for follow-up but the student is still enrolled
  // and can sign in immediately.
  try {
    const user = await UserModel.findById(submission.userId)
      .select("name email")
      .lean();
    const bootcamp = await BootcampModel.findById(submission.bootcampId)
      .select("title")
      .lean();
    if (user?.email) {
      sendEnrollmentApproved(user.email, {
        name: user.name ?? "Student",
        bootcampTitle: bootcamp?.title ?? "your bootcamp",
      }).catch((emailErr: unknown) =>
        logger.error(
          { err: emailErr, submissionId: params.id },
          "admin.approve.email_failed",
        ),
      );
    }
  } catch (err) {
    logger.error(
      { err, submissionId: params.id },
      "admin.approve.email_lookup_failed",
    );
  }

  logger.info(
    {
      submissionId: params.id,
      adminUserId,
      studentId: submission.userId,
      bootcampId: submission.bootcampId,
    },
    "admin.approve.success",
  );

  return NextResponse.json({ status: "approved" });
}
