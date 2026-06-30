import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { GlassNavbar } from "@/components/glass";
import { BackdropMesh } from "@/components/ui";
import { getUserById } from "@/server/store";
import { effectivePlan } from "@/server/lib/quota";
import { PLAN_PRICING, type SubscriptionPlan } from "@/shared/types";

export const dynamic = "force-dynamic";

interface Props {
  // Two query shapes are produced today:
  //   ?kind=jobs&plan=jobs_quarterly|jobs_annual   — new Razorpay flow
  //   ?kind=courses                                — course-cart flow
  //   ?plan=premium                                — legacy PhonePe callback
  // Older buyers may also land here with no params at all; we resolve the
  // confirmation copy off the server-side user record so the right message
  // always renders.
  searchParams: { kind?: string; plan?: string };
}

/**
 * Post-payment confirmation page. The plan/grant is already in place by the
 * time this renders — the Razorpay /verify route (or the webhook, on a callback
 * drop) has updated the user. We just read the live record and show what they
 * actually bought instead of trusting the browser URL.
 */
export default async function UpgradeSuccessPage({ searchParams }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?next=/upgrade");
  if (session.user.role !== "student") redirect("/dashboard");

  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  const kind = searchParams.kind === "courses" ? "courses" : "plan";

  // Courses → confetti + bootcamp link. Don't talk about plans here.
  if (kind === "courses") {
    return (
      <Shell
        title="Courses unlocked."
        body="Your bootcamp courses are ready. You have 3 months of access starting today — every cohort in each room you bought is open."
        primary={{ href: "/bootcamps", label: "Open my bootcamps" }}
      />
    );
  }

  // Plan purchase. Prefer the live record (webhook is source of truth) and
  // fall back to the URL hint only when the record hasn't caught up yet.
  const livePlan = effectivePlan(user);
  const queryPlan = isKnownPlan(searchParams.plan) ? searchParams.plan : undefined;
  const plan: SubscriptionPlan =
    livePlan !== "free" ? livePlan : queryPlan ?? "free";

  if (plan === "free") {
    // Either the user hit /upgrade/success directly without paying, or the
    // webhook hasn't landed yet. Push them home rather than lie about a
    // grant that didn't happen.
    redirect("/dashboard");
  }

  const label = PLAN_PRICING[plan]?.label ?? "Your plan";
  const body =
    plan === "premium"
      ? "Unlimited applications, AI Coach, and every bootcamp included until your plan expires."
      : "Unlimited applications, AI Coach, and Q&A unlocked for the duration of your plan.";

  return (
    <Shell
      title={`${label} unlocked.`}
      body={body}
      primary={{ href: "/dashboard", label: "Go to dashboard" }}
      secondary={{ href: "/bootcamps", label: "Browse bootcamps" }}
    />
  );
}

function Shell({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="relative min-h-screen">
      <BackdropMesh />
      <GlassNavbar />
      <main className="mx-auto max-w-2xl px-4 pt-32 pb-20 text-center">
        <CheckCircle2 className="mx-auto text-green-600" size={64} strokeWidth={1.5} />
        <h1 className="mt-6 font-display font-extrabold text-display-xl text-neutral-950 leading-tight">
          {title}
        </h1>
        <p className="mt-4 text-body-md text-neutral-500 leading-relaxed">{body}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href={primary.href}
            className="rounded-xl bg-neutral-900 text-white px-6 py-3 text-body-sm font-medium hover:bg-neutral-800"
          >
            {primary.label}
          </Link>
          {secondary ? (
            <Link
              href={secondary.href}
              className="rounded-xl border border-neutral-300 px-6 py-3 text-body-sm font-medium hover:bg-neutral-50"
            >
              {secondary.label}
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

/**
 * URL `plan` param is untrusted external input. Narrow it to a real
 * SubscriptionPlan via the PLAN_PRICING key set instead of asserting the
 * type — an unknown string from the query becomes `undefined`, not a
 * fabricated key the renderer then trusts.
 */
function isKnownPlan(s: string | undefined): s is SubscriptionPlan {
  return typeof s === "string" && Object.prototype.hasOwnProperty.call(PLAN_PRICING, s);
}
