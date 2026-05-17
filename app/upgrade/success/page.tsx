import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { GlassNavbar } from "@/components/glass";
import { BackdropMesh } from "@/components/ui";

interface Props {
  searchParams: { plan?: string };
}

/**
 * Lightweight confetti page. The actual plan activation already happened
 * in /api/billing/callback before this page renders.
 */
export default function UpgradeSuccessPage({ searchParams }: Props) {
  const plan = searchParams.plan;
  if (plan !== "pro" && plan !== "premium") {
    redirect("/dashboard");
  }
  const label = plan === "premium" ? "Premium" : "Pro";
  return (
    <div className="relative min-h-screen">
      <BackdropMesh />
      <GlassNavbar />
      <main className="mx-auto max-w-2xl px-4 pt-32 pb-20 text-center">
        <CheckCircle2 className="mx-auto text-green-600" size={64} strokeWidth={1.5} />
        <h1 className="mt-6 font-display font-extrabold text-display-xl text-neutral-950 leading-tight">
          {label} unlocked.
        </h1>
        <p className="mt-4 text-body-md text-neutral-500 leading-relaxed">
          {plan === "premium"
            ? "Unlimited applications, AI Coach forever, every bootcamp included. Welcome aboard."
            : "5 applications a month + AI Coach for the next 30 days. Renews when you tell us to."}
        </p>
        <div className="mt-10 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-neutral-900 text-white px-6 py-3 text-body-sm font-medium hover:bg-neutral-800"
          >
            Go to dashboard
          </Link>
          {plan === "premium" ? (
            <Link
              href="/bootcamps"
              className="rounded-xl border border-neutral-300 px-6 py-3 text-body-sm font-medium hover:bg-neutral-50"
            >
              Browse bootcamps
            </Link>
          ) : null}
        </div>
        <p className="mt-12 text-body-xs text-neutral-500">
          Receipt sent to your email. Manage your plan from{" "}
          <Link href="/student/settings" className="underline underline-offset-4">
            Settings
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
