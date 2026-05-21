/**
 * /student/bootcamps/[slug]/enroll — protected bootcamp enrollment page.
 *
 * Server-component shell:
 *   1. Require auth, redirect to /login with `next=...` if not signed in.
 *   2. Reject non-student roles.
 *   3. Find the bootcamp by slug (= bootcamp `_id` in this codebase).
 *   4. Block re-enrolment if user already has a pending/approved submission
 *      for this bootcamp (avoids 409 surprise on the form submit).
 *   5. Render the client `<EnrollForm />` with the pricing breakdown.
 *
 * The actual form lives in `./EnrollForm.tsx` (client). The server passes
 * down only what the form needs — no Mongo docs leak to the client.
 */
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { connectMongo } from "@/server/db/mongo";
import { BootcampModel, PaymentSubmissionModel } from "@/server/db/models";
import { computeTotalPaise, formatPaiseAsINR } from "@/server/payments/pricing";
import { EnrollForm } from "./EnrollForm";

export const dynamic = "force-dynamic"; // session-dependent, never cache

interface PageProps {
  params: { slug: string };
}

export default async function EnrollPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?next=/student/bootcamps/${params.slug}/enroll`);
  }
  if (session.user.role !== "student") {
    redirect("/dashboard");
  }

  await connectMongo();
  const bootcamp = await BootcampModel.findById(params.slug).lean();
  if (!bootcamp) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-display font-bold text-brand-ink">
          Bootcamp not found
        </h1>
        <p className="text-brand-muted mt-2">
          The bootcamp you're looking for doesn't exist or has been removed.
        </p>
      </main>
    );
  }

  // Block double-enrolment surprises — show a friendly state instead of
  // letting the user fill the form and hit a 409 on submit.
  const existing = await PaymentSubmissionModel.findOne({
    userId: session.user.id,
    bootcampId: String(bootcamp._id),
    status: { $in: ["pending_verification", "approved"] },
  }).lean();
  if (existing) {
    const statusCopy =
      existing.status === "approved"
        ? "You're already enrolled in this bootcamp."
        : "We've already received a payment submission from you for this bootcamp. It's pending verification — you'll get an email within ~20 minutes.";
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-display font-bold text-brand-ink mb-3">
          {bootcamp.title}
        </h1>
        <div className="rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-6 text-sm text-brand-ink">
          {statusCopy}
        </div>
        <a
          href="/dashboard"
          className="inline-block mt-6 text-sm font-semibold text-brand-primary hover:underline"
        >
          ← Back to dashboard
        </a>
      </main>
    );
  }

  const priceBreakdown = computeTotalPaise({
    priceInPaise: bootcamp.priceInPaise ?? 0,
    gstPercent: bootcamp.gstPercent ?? 18,
  });

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-brand-muted mb-2">
          Enroll
        </p>
        <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-brand-ink">
          {bootcamp.title}
        </h1>
        <p className="text-brand-muted mt-2 max-w-xl">
          Pay via UPI, then paste your transaction ID below. Your account
          activates within ~20 minutes once we verify.
        </p>
      </header>

      <EnrollForm
        bootcampId={String(bootcamp._id)}
        bootcampTitle={bootcamp.title ?? "Bootcamp"}
        baseAmountLabel={formatPaiseAsINR(priceBreakdown.baseInPaise)}
        gstAmountLabel={formatPaiseAsINR(priceBreakdown.gstInPaise)}
        totalAmountLabel={formatPaiseAsINR(priceBreakdown.totalInPaise)}
        gstPercent={bootcamp.gstPercent ?? 18}
      />
    </main>
  );
}
