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
  const guard = await adminLoadSubmission(params.id, _req);
  if (guard.errorResponse) return guard.errorResponse;
  const { adminUserId, submission } = guard;
  if (!submission || !adminUserId) {
    return NextResponse.json({ error: "Guard failed" }, { status: 500 });
  }

  const isPlanPurchase = submission.bootcampId.startsWith("plan:");

  // "premium" is the only live plan. Legacy "pro" (and anything else) is no
  // longer a valid tier — approving it would write an unrecognised plan that
  // effectivePlan() treats as free, i.e. the student pays and gets nothing.
  // Reject loudly instead of silently mis-activating.
  if (isPlanPurchase && submission.bootcampId !== "plan:premium") {
    return NextResponse.json(
      { error: "unsupported_plan", detail: submission.bootcampId },
      { status: 400 },
    );
  }

  // Run the writes in a transaction so they're atomic.
  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      submission.status = "approved";
      submission.reviewedBy = adminUserId;
      submission.reviewedAt = new Date();
      await submission.save({ session: dbSession });

      if (isPlanPurchase) {
        // Premium = one-time lifetime (no expiry). Guarded above to be the
        // only plan that reaches here.
        const now = new Date();
        await UserModel.updateOne(
          { _id: submission.userId },
          {
            $set: {
              plan: "premium",
              planType: "premium",
              planActivatedAt: now.toISOString(),
              lastBillingTxnId: submission.utr,
              planExpiresAt: null,
            },
          },
          { session: dbSession },
        );
      } else {
        // Bootcamp enrollment (existing flow)
        await BootcampModel.updateOne(
          { _id: submission.bootcampId },
          { $addToSet: { enrolledStudentIds: submission.userId } },
          { session: dbSession },
        );

        await UserModel.updateOne(
          { _id: submission.userId },
          {
            $addToSet: {
              "profile.enrolledBootcamps": submission.bootcampId,
            },
          },
          { session: dbSession },
        );
      }
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

    const itemTitle = isPlanPurchase
      ? `unGhost ${submission.bootcampId.replace("plan:", "").charAt(0).toUpperCase() + submission.bootcampId.replace("plan:", "").slice(1)} plan`
      : (
          await BootcampModel.findById(submission.bootcampId)
            .select("title")
            .lean()
        )?.title ?? "your bootcamp";

    if (user?.email) {
      sendEnrollmentApproved(user.email, {
        name: user.name ?? "Student",
        bootcampTitle: itemTitle,
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
