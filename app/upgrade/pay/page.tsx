import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserById } from "@/server/store";
import { PLAN_PRICING, PREMIUM_GST_PERCENT } from "@/shared/types";
import { applyCoupon, computeTotalPaise } from "@/server/payments/pricing";
import { GlassNavbar } from "@/components/glass";
import { BackdropMesh } from "@/components/ui";
import { ManualPaymentFlow } from "./ManualPaymentFlow";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { plan?: string; coupon?: string };
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
  // Apply any coupon to the base, then add GST. percentOff > 0 = valid coupon.
  const { basePaise: discountedBase, percentOff } = applyCoupon(
    pricing.amountINR * 100,
    searchParams.coupon,
  );
  const appliedCoupon = percentOff > 0 ? searchParams.coupon : undefined;
  const { baseInPaise, gstInPaise, totalInPaise } = computeTotalPaise({
    priceInPaise: discountedBase,
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
          coupon={appliedCoupon}
          couponPercentOff={percentOff}
          cadence={pricing.cadence}
          userName={user.name ?? ""}
          userEmail={user.email ?? ""}
          userPhone={user.profile?.contactPhone ?? ""}
        />
      </main>
    </div>
  );
}
