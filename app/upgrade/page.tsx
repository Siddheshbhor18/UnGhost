import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/server/auth";
import { getUserById } from "@/server/store";
import { effectivePlan } from "@/server/lib/quota";
import { GlassNavbar } from "@/components/glass";
import { BackdropMesh } from "@/components/ui";
import { UpgradePlanPicker } from "@/components/student/UpgradePlanPicker";
import { PLAN_LIMITS, PLAN_PRICING } from "@/shared/types";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { to?: string; error?: string };
}

/**
 * /upgrade — student subscription picker.
 *
 * Three tiers, two actually purchasable (Pro monthly, Premium lifetime).
 * The picker POSTs to /api/billing/checkout which mints a PhonePe order
 * and redirects the browser to the provider redirectUrl. After success
 * the user lands on /upgrade/success?plan=<plan>.
 */
export default async function UpgradePage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?next=/upgrade${searchParams.to ? `?to=${searchParams.to}` : ""}`);
  }
  if (session.user.role !== "student") {
    redirect(session.user.role === "recruiter" ? "/recruiter/command" : "/admin/metrics");
  }
  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  const currentPlan = effectivePlan(user);
  const errorCode = searchParams.error;

  return (
    <div className="relative min-h-screen">
      <BackdropMesh />
      <GlassNavbar />
      <main className="mx-auto max-w-content px-4 pt-28 pb-20">
        <header className="text-center mb-14">
          <p className="text-body-xs uppercase tracking-widest text-neutral-500 mb-3">
            Subscription
          </p>
          <h1 className="font-display font-extrabold text-display-xl text-neutral-950 leading-tight mb-4">
            Unlock the platform.
          </h1>
          <p className="text-body-md text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Your current plan:{" "}
            <span className="font-medium text-neutral-900">
              {PLAN_PRICING[currentPlan].label}
            </span>
            . Upgrade once, hire forever.
          </p>
          {errorCode ? (
            <p className="mt-5 inline-block rounded-full bg-red-50 text-red-700 text-body-sm px-4 py-2">
              Payment {errorCode.replace(/^payment_/, "").replace(/_/g, " ")} — try again or
              contact support@unghost.com.
            </p>
          ) : null}
        </header>

        <UpgradePlanPicker
          currentPlan={currentPlan}
          recommended={
            searchParams.to === "premium" || searchParams.to === "pro"
              ? (searchParams.to as "premium" | "pro")
              : null
          }
        />

        <div className="mt-14 text-center">
          <p className="text-body-xs text-neutral-500 mb-3">
            GST 18% inclusive · UPI / Card / NetBanking via PhonePe · All sales final.
          </p>
          <Link
            href="/refund-policy"
            className="text-body-sm text-neutral-700 underline underline-offset-4"
          >
            Read the refund policy
          </Link>
        </div>

        <section className="mt-16 grid md:grid-cols-3 gap-6 text-body-sm text-neutral-700">
          <FeatureRow
            title="Free trial"
            body={`${PLAN_LIMITS.free.applicationCap.kind === "trial" ? PLAN_LIMITS.free.applicationCap.count : 0} lifetime applications. No card needed.`}
          />
          <FeatureRow
            title="Pro · monthly"
            body="5 applications every 30 days, AI Coach, Q&A. Cancel anytime."
          />
          <FeatureRow
            title="Premium · lifetime"
            body="Unlimited applications + every bootcamp included. Pay once."
          />
        </section>
      </main>
    </div>
  );
}

function FeatureRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/60 p-5">
      <p className="font-display font-bold text-neutral-900 mb-1">{title}</p>
      <p className="leading-relaxed">{body}</p>
    </div>
  );
}
