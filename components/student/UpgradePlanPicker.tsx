"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { SubscriptionPlan } from "@/shared/types";

interface PickerProps {
  currentPlan: SubscriptionPlan;
  recommended: "premium" | null;
  /** Base price label, e.g. "₹4,999" (exclusive of GST). */
  premiumPriceLabel: string;
  /** GST-inclusive note, e.g. "+ 18% GST · ₹5,898.82 total". */
  premiumGstNote: string;
  /** Lifetime offer is sold out — no new premium purchases. */
  offerClosed: boolean;
  /** Remaining lifetime seats (for a scarcity nudge); null when not shown. */
  seatsLeft: number | null;
}

/**
 * Two-card subscription picker. Free is the default tier; Premium kicks off
 * a /api/billing/checkout POST (currently routed to the manual QR payment
 * page) and, once paid + approved, unlocks lifetime access.
 */
export function UpgradePlanPicker({
  currentPlan,
  recommended,
  premiumPriceLabel,
  premiumGstNote,
  offerClosed,
  seatsLeft,
}: PickerProps) {
  const router = useRouter();
  const [submittingPlan, setSubmittingPlan] = useState<"premium" | null>(null);

  function buy(plan: "premium") {
    setSubmittingPlan(plan);
    // Redirect to manual QR payment page (stopgap until PhonePe KYC clears)
    router.push(`/upgrade/pay?plan=${plan}`);
  }

  return (
    <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
      <Card
        tier="free"
        title="Free"
        price="₹0"
        sub="lifetime trial"
        features={[
          "2 applications (lifetime)",
          "Browse all jobs + bootcamps",
          "Application credit back if a recruiter ghosts",
        ]}
        currentPlan={currentPlan}
        recommended={false}
      >
        <Cta state={currentPlan === "free" ? "current" : "free-active"} />
      </Card>

      <Card
        tier="premium"
        title="Premium"
        price={premiumPriceLabel}
        sub={premiumGstNote}
        features={[
          "Unlimited applications",
          "AI Coach + Q&A forever",
          "Every bootcamp included",
          "Verified Skill badges from bootcamps",
        ]}
        currentPlan={currentPlan}
        recommended={recommended === "premium"}
      >
        {currentPlan === "premium" ? (
          <Cta state="current" />
        ) : offerClosed ? (
          <div className="w-full rounded-xl bg-neutral-100 text-neutral-500 text-body-sm font-medium py-3 text-center">
            Lifetime offer closed
          </div>
        ) : (
          <>
            {seatsLeft !== null && seatsLeft <= 30 ? (
              <p className="mb-2 text-center text-body-xs font-medium text-violet-700">
                Only {seatsLeft} lifetime {seatsLeft === 1 ? "seat" : "seats"} left
              </p>
            ) : null}
            <button
              disabled={submittingPlan !== null}
              onClick={() => buy("premium")}
              className="w-full rounded-xl bg-violet-600 text-white text-body-sm font-medium py-3 hover:bg-violet-700 disabled:opacity-50"
            >
              {submittingPlan === "premium" ? <Spinner /> : "Go Premium"}
            </button>
          </>
        )}
      </Card>
    </div>
  );
}

function Card({
  tier,
  title,
  price,
  sub,
  features,
  recommended,
  children,
}: {
  tier: SubscriptionPlan;
  title: string;
  price: string;
  sub: string;
  features: string[];
  currentPlan: SubscriptionPlan;
  recommended: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "rounded-2xl p-6 flex flex-col border bg-white/80 backdrop-blur",
        recommended
          ? "border-violet-400 ring-2 ring-violet-200 shadow-lg"
          : "border-neutral-200",
        tier === "premium" && "lg:scale-[1.02]",
      )}
    >
      {recommended ? (
        <span className="self-start mb-3 inline-block rounded-full bg-violet-600 text-white text-body-xs font-medium px-3 py-1">
          Recommended
        </span>
      ) : null}
      <p className="font-display font-bold text-neutral-900 text-lg">{title}</p>
      <p className="mt-4 mb-1">
        <span className="font-display font-extrabold text-3xl text-neutral-950">{price}</span>{" "}
        <span className="text-body-xs text-neutral-500">{sub}</span>
      </p>
      <ul className="mt-5 space-y-2 text-body-sm text-neutral-700 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check size={14} className="mt-1 text-green-600 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Cta({ state }: { state: "current" | "free-active" }) {
  if (state === "current") {
    return (
      <div className="w-full rounded-xl bg-neutral-100 text-neutral-700 text-body-sm font-medium py-3 text-center">
        Current plan
      </div>
    );
  }
  return (
    <div className="w-full rounded-xl bg-neutral-100 text-neutral-700 text-body-sm font-medium py-3 text-center">
      Default tier
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Loader2 size={14} className="animate-spin" /> Redirecting…
    </span>
  );
}
