"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { SubscriptionPlan } from "@/shared/types";
import {
  applyCoupon,
  computeTotalPaise,
  formatPaiseAsINR,
} from "@/shared/lib/pricing";

interface PickerProps {
  currentPlan: SubscriptionPlan;
  recommended: "premium" | null;
  /** Premium base price (pre-GST) in paise — the picker computes the display. */
  premiumBaseInPaise: number;
  /** GST percent applied on top of the base. */
  gstPercent: number;
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
  premiumBaseInPaise,
  gstPercent,
  offerClosed,
  seatsLeft,
}: PickerProps) {
  const router = useRouter();
  const [submittingPlan, setSubmittingPlan] = useState<"premium" | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  // Price recomputed from the base whenever a valid coupon is applied. The
  // server re-validates the coupon at payment, so this is display-only.
  const { basePaise: discountedBase, percentOff } = applyCoupon(
    premiumBaseInPaise,
    applied,
  );
  const { baseInPaise, totalInPaise } = computeTotalPaise({
    priceInPaise: discountedBase,
    gstPercent,
  });
  const fullTotal = computeTotalPaise({
    priceInPaise: premiumBaseInPaise,
    gstPercent,
  }).totalInPaise;
  const premiumPriceLabel = formatPaiseAsINR(baseInPaise);
  const premiumGstNote = `+ ${gstPercent}% GST · ${formatPaiseAsINR(totalInPaise, { withPaise: true })} total`;

  function applyCode() {
    const code = couponInput.trim();
    if (!code) return;
    const { percentOff: pct } = applyCoupon(premiumBaseInPaise, code);
    if (pct > 0) {
      setApplied(code);
      setCouponMsg(`${code.toUpperCase()} applied — ${pct}% off`);
    } else {
      setApplied(null);
      setCouponMsg("That code isn't valid.");
    }
  }

  function buy(plan: "premium") {
    setSubmittingPlan(plan);
    // Redirect to manual QR payment page (stopgap until PhonePe KYC clears).
    // Carry the applied coupon — the payment API re-validates it.
    router.push(
      `/upgrade/pay?plan=${plan}${applied ? `&coupon=${encodeURIComponent(applied)}` : ""}`,
    );
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
            {percentOff > 0 && (
              <p className="mb-2 text-center text-body-xs text-neutral-500">
                <span className="line-through">
                  {formatPaiseAsINR(fullTotal, { withPaise: true })}
                </span>{" "}
                <span className="font-semibold text-emerald-700">
                  {percentOff}% off applied
                </span>
              </p>
            )}
            {/* Coupon code */}
            <div className="mb-3 flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Coupon code"
                className="flex-1 min-w-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-body-sm focus:outline-none focus:border-violet-400"
              />
              <button
                type="button"
                onClick={applyCode}
                className="rounded-xl border border-violet-300 text-violet-700 text-body-sm font-medium px-3 py-2 hover:bg-violet-50"
              >
                Apply
              </button>
            </div>
            {couponMsg && (
              <p
                className={clsx(
                  "mb-2 text-center text-body-xs font-medium",
                  percentOff > 0 ? "text-emerald-700" : "text-rose-600",
                )}
              >
                {couponMsg}
              </p>
            )}
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
