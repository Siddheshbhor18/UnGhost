import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserById } from "@/server/store";
import { PLAN_PRICING } from "@/shared/types";
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

  const plan = searchParams.plan as "pro" | "premium" | undefined;
  if (!plan || !["pro", "premium"].includes(plan)) redirect("/upgrade");

  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  const pricing = PLAN_PRICING[plan];

  return (
    <div className="relative min-h-screen">
      <BackdropMesh />
      <GlassNavbar />
      <main className="mx-auto max-w-lg px-4 pt-28 pb-20">
        <ManualPaymentFlow
          plan={plan}
          planLabel={pricing.label}
          amountINR={pricing.amountINR}
          cadence={pricing.cadence}
          userName={user.name ?? ""}
          userEmail={user.email ?? ""}
          userPhone={user.profile?.contactPhone ?? ""}
        />
      </main>
    </div>
  );
}
