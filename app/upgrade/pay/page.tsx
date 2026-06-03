import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserById } from "@/server/store";
import { PLAN_PRICING, PREMIUM_GST_PERCENT } from "@/shared/types";
import { computeTotalPaise } from "@/server/payments/pricing";
import { GlassNavbar } from "@/components/glass";
import { BackdropMesh } from "@/components/ui";
import { ManualPaymentFlow } from "./ManualPaymentFlow";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { plan?: string };
}

export default async function ManualPayPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?next=/upgrade/pay");
  if (session.user.role !== "student") redirect("/dashboard");

  const plan = searchParams.plan as "premium" | undefined;
  if (plan !== "premium") redirect("/upgrade");

  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  const pricing = PLAN_PRICING[plan];
  const { baseInPaise, gstInPaise, totalInPaise } = computeTotalPaise({
    priceInPaise: pricing.amountINR * 100,
    gstPercent: PREMIUM_GST_PERCENT,
  });

  return (
    <div className="relative min-h-screen">
      <BackdropMesh />
      <GlassNavbar />
      <main className="mx-auto max-w-lg px-4 pt-28 pb-20">
        <ManualPaymentFlow
          plan={plan}
          planLabel={pricing.label}
          baseInPaise={baseInPaise}
          gstInPaise={gstInPaise}
          totalInPaise={totalInPaise}
          gstPercent={PREMIUM_GST_PERCENT}
          cadence={pricing.cadence}
          userName={user.name ?? ""}
          userEmail={user.email ?? ""}
          userPhone={user.profile?.contactPhone ?? ""}
        />
      </main>
    </div>
  );
}
