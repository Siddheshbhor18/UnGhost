"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { SubscriptionPlan } from "@/shared/types";
import { PLAN_PRICING } from "@/shared/types";

interface PickerProps {
  currentPlan: SubscriptionPlan;
  recommended: "pro" | "premium" | null;
}

/**
 * Three-card subscription picker. Free is current/CTA-disabled; Pro and
 * Premium kick off a /api/billing/checkout POST and bounce to the PhonePe
 * redirect URL the server returns.
 */
export function UpgradePlanPicker({ currentPlan, recommended }: PickerProps) {
  const router = useRouter();
  const [submittingPlan, setSubmittingPlan] = useState<"pro" | "premium" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(plan: "pro" | "premium") {
    setError(null);
    setSubmittingPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { redirectUrl?: string; error?: string };
      if (!res.ok || !data.redirectUrl) {
        setError(data.error ?? "Checkout failed. Try again.");
        setSubmittingPlan(null);
        return;
      }
      // In mock mode the server returns our own callback URL, so this still
      // works without any external dependency.
      window.location.href = data.redirectUrl;
    } catch (err) {
      setError((err as Error).message);
      setSubmittingPlan(null);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-5">
      <Card
        tier="free"
        title="Free"
        price="₹0"
        sub="lifetime trial"
        features={[
          "2 applications (lifetime)",
          "Browse all jobs + bootcamps",
          "Refunds on recruiter ghost",
        ]}
        currentPlan={currentPlan}
        recommended={false}
      >
        <Cta state={currentPlan === "free" ? "current" : "free-active"} />
      </Card>

      <Card
        tier="pro"
        title="Pro"
        price={`₹${PLAN_PRICING.pro.amountINR.toLocaleString("en-IN")}`}
        sub="per month"
        features={[
          "5 applications every 30 days",
          "AI Coach (30-day rolling)",
          "Q&A with recruiters",
          "Cancel anytime",
        ]}
        currentPlan={currentPlan}
        recommended={recommended === "pro"}
      >
        {currentPlan === "premium" ? (
          <Cta state="downgrade-blocked" />
        ) : currentPlan === "pro" ? (
          <button
            disabled={submittingPlan !== null}
            onClick={() => buy("pro")}
            className="w-full rounded-xl bg-neutral-900 text-white text-body-sm font-medium py-3 hover:bg-neutral-800 disabled:opacity-50"
          >
            {submittingPlan === "pro" ? <Spinner /> : "Renew 30 days"}
          </button>
        ) : (
          <button
            disabled={submittingPlan !== null}
            onClick={() => buy("pro")}
            className="w-full rounded-xl bg-neutral-900 text-white text-body-sm font-medium py-3 hover:bg-neutral-800 disabled:opacity-50"
          >
            {submittingPlan === "pro" ? <Spinner /> : "Go Pro"}
          </button>
        )}
      </Card>

      <Card
        tier="premium"
        title="Premium"
        price={`₹${PLAN_PRICING.premium.amountINR.toLocaleString("en-IN")}`}
        sub="one-time · lifetime"
        features={[
          "Unlimited applications",
          "AI Coach + Q&A forever",
          "Every bootcamp included",
          "Priority refund queue",
        ]}
        currentPlan={currentPlan}
        recommended={recommended === "premium"}
      >
        {currentPlan === "premium" ? (
          <Cta state="current" />
        ) : (
          <button
            disabled={submittingPlan !== null}
            onClick={() => buy("premium")}
            className="w-full rounded-xl bg-violet-600 text-white text-body-sm font-medium py-3 hover:bg-violet-700 disabled:opacity-50"
          >
            {submittingPlan === "premium" ? <Spinner /> : "Go Premium"}
          </button>
        )}
      </Card>

      {error ? (
        <p className="md:col-span-3 text-center text-body-sm text-red-700">{error}</p>
      ) : null}
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

function Cta({ state }: { state: "current" | "free-active" | "downgrade-blocked" }) {
  if (state === "current") {
    return (
      <div className="w-full rounded-xl bg-neutral-100 text-neutral-700 text-body-sm font-medium py-3 text-center">
        Current plan
      </div>
    );
  }
  if (state === "free-active") {
    return (
      <div className="w-full rounded-xl bg-neutral-100 text-neutral-700 text-body-sm font-medium py-3 text-center">
        Default tier
      </div>
    );
  }
  return (
    <div className="w-full rounded-xl bg-neutral-100 text-neutral-500 text-body-sm py-3 text-center">
      Downgrade unavailable
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
