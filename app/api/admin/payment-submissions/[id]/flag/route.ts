/**
 * POST /api/admin/payment-submissions/[id]/flag
 *
 * Admin flags a submission for manual review (holding state).
 *
 * Effect:
 *   • Submission.status → 'flagged' + reviewedBy/At + optional notes.
 *   • Seat stays counted (currentSubmissionCount unchanged) — admin may
 *     still approve later. If they ultimately reject, the reject route
 *     decrements then.
 *   • SILENT — student is NOT notified. They sit in pending purgatory
 *     until the admin makes a final call.
 *
 * Use cases: suspicious UTR, amount mismatch needing student outreach,
 * possible fraud needing operational follow-up.
 *
 * Notes are optional, free-text, 280 char max (admin-only — never
 * surfaced to the student).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/server/lib/logger";
import { adminLoadSubmission } from "../_shared";

const inputSchema = z.object({
  notes: z.string().trim().max(280).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  // Notes are optional, but if the body exists it must parse.
  let parsedNotes: string | undefined;
  try {
    const text = await req.text();
    if (text.trim()) {
      const body = JSON.parse(text);
      const parsed = inputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message ?? "Invalid input" },
          { status: 400 },
        );
      }
      parsedNotes = parsed.data.notes;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const guard = await adminLoadSubmission(params.id);
  if (guard.errorResponse) return guard.errorResponse;
  const { adminUserId, submission } = guard;
  if (!submission || !adminUserId) {
    return NextResponse.json({ error: "Guard failed" }, { status: 500 });
  }

  submission.status = "flagged";
  submission.reviewedBy = adminUserId;
  submission.reviewedAt = new Date();
  if (parsedNotes) submission.notes = parsedNotes;
  await submission.save();

  logger.info(
    {
      submissionId: params.id,
      adminUserId,
      notesPresent: Boolean(parsedNotes),
    },
    "admin.flag.success",
  );

  return NextResponse.json({ status: "flagged" });
}
