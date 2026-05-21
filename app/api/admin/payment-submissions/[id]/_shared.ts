/**
 * Shared guard for the three admin payment-submission action routes
 * (approve / reject / flag). All three share the same shape:
 *
 *   1. Authenticate the session.
 *   2. Verify the role is "admin" (singular — this codebase uses one role
 *      per user, NOT a roles[] array; see auth/index.ts).
 *   3. Load + lock the submission, fail-loud if missing or already actioned.
 *
 * Returns a normalised tuple. Callers handle the actual mutation + email.
 */
import { NextResponse } from "next/server";
import type { HydratedDocument } from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { connectMongo } from "@/server/db/mongo";
import {
  PaymentSubmissionModel,
  type PaymentSubmission,
} from "@/server/db/models";

export interface GuardResult {
  /** Set when the guard short-circuits — caller returns this directly. */
  errorResponse?: NextResponse;
  /** Set on the happy path. */
  adminUserId?: string;
  submission?: HydratedDocument<PaymentSubmission>;
}

/**
 * Run the admin + load-submission guard. On any failure returns a ready-
 * to-return NextResponse; on success returns `{ adminUserId, submission }`.
 */
export async function adminLoadSubmission(
  submissionId: string,
): Promise<GuardResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      errorResponse: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }
  if (session.user.role !== "admin") {
    return {
      errorResponse: NextResponse.json(
        { error: "Forbidden — admin role required" },
        { status: 403 },
      ),
    };
  }
  await connectMongo();
  const submission = (await PaymentSubmissionModel.findById(
    submissionId,
  )) as HydratedDocument<PaymentSubmission> | null;
  if (!submission) {
    return {
      errorResponse: NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      ),
    };
  }
  // Only `pending_verification` and `flagged` are actionable from the
  // admin queue. Already-approved / already-rejected submissions short
  // out — guards against double-clicks racing the optimistic UI.
  if (
    submission.status !== "pending_verification" &&
    submission.status !== "flagged"
  ) {
    return {
      errorResponse: NextResponse.json(
        {
          error: `Submission is already ${submission.status}. Refresh to see the latest state.`,
        },
        { status: 409 },
      ),
    };
  }
  return { adminUserId: session.user.id, submission };
}
