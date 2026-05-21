/**
 * /admin/payment-approvals — admin queue for verifying QR-payment claims.
 *
 * Layout-level auth already gates the entire /admin/* tree (admin role
 * required), so this page just reads + renders.
 *
 * Query: pending_verification + flagged, oldest first (fair queue). Joins
 * student name/email + bootcamp title + amount via two follow-up fetches
 * (no Mongoose populate — IDs are strings, not ObjectIds, so we hand-join).
 *
 * The interactive table lives in `./ApprovalQueue.tsx` (client) so we keep
 * server-side data fetching here and let React handle the action buttons.
 */
import { connectMongo } from "@/server/db/mongo";
import {
  BootcampModel,
  PaymentSubmissionModel,
  UserModel,
} from "@/server/db/models";
import { ApprovalQueue, type QueueRow } from "./ApprovalQueue";

export const dynamic = "force-dynamic";

export default async function PaymentApprovalsPage() {
  await connectMongo();

  // Both pending + flagged are actionable from this page. Flagged sits at
  // the bottom of the queue (newer once-actioned items) but still appears.
  const submissions = await PaymentSubmissionModel.find({
    status: { $in: ["pending_verification", "flagged"] },
  })
    .sort({ status: 1, createdAt: 1 }) // pending_verification before flagged alphabetically; tweak if needed
    .limit(100)
    .lean();

  const studentIds = [...new Set(submissions.map((s) => s.userId))];
  const bootcampIds = [...new Set(submissions.map((s) => s.bootcampId))];

  const [students, bootcamps] = await Promise.all([
    UserModel.find({ _id: { $in: studentIds } })
      .select("name email")
      .lean(),
    BootcampModel.find({ _id: { $in: bootcampIds } })
      .select("title")
      .lean(),
  ]);

  const studentById = new Map(students.map((u) => [String(u._id), u]));
  const bootcampById = new Map(bootcamps.map((b) => [String(b._id), b]));

  const rows: QueueRow[] = submissions.map((s) => {
    const u = studentById.get(s.userId);
    const b = bootcampById.get(s.bootcampId);
    return {
      id: String(s._id),
      studentName: u?.name ?? "(unknown)",
      studentEmail: u?.email ?? "—",
      bootcampTitle: b?.title ?? "(deleted bootcamp)",
      expectedAmountInPaise: s.expectedAmountInPaise,
      utr: s.utr,
      upiApp: s.upiApp,
      payerMobile: s.payerMobile,
      // The Mongo filter only fetches these two statuses; the cast tells TS.
      status: s.status as "pending_verification" | "flagged",
      createdAt:
        s.createdAt instanceof Date
          ? s.createdAt.toISOString()
          : String(s.createdAt),
    };
  });

  const pendingCount = rows.filter(
    (r) => r.status === "pending_verification",
  ).length;
  const flaggedCount = rows.filter((r) => r.status === "flagged").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand-muted mb-1">
          Operations
        </p>
        <h1 className="font-display font-extrabold text-3xl text-brand-ink">
          Payment approvals
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          {pendingCount} pending · {flaggedCount} flagged · oldest first
        </p>
      </header>

      <ApprovalQueue rows={rows} />
    </div>
  );
}
