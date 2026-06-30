"use client";

import { Check } from "lucide-react";
import clsx from "clsx";
import {
  PLAN_PRICING,
  GST_PERCENT,
  planAlreadyCovered,
  type SubscriptionPlan,
  type PurchasableJobsPlan,
} from "@/shared/types";
import { computeTotalPaise, formatPaiseAsINR } from "@/shared/lib/pricing";
import { CheckoutButton } from "@/components/courses/CheckoutButton";

interface PickerProps {
  currentPlan: SubscriptionPlan;
  prefill?: { name?: string; email?: string; contact?: string };
}

const JOBS: {
  plan: PurchasableJobsPlan;
  title: string;
  cadence: string;
  badge?: string;
}[] = [
  { plan: "jobs_quarterly", title: "Jobs · 3 months", cadence: "for 3 months" },
  { plan: "jobs_annual", title: "Jobs · 1 year", cadence: "for 12 months", badge: "Best value" },
];

const PAID_FEATURES = [
  "Unlimited job applications",
  "AI Career Coach (cross-session memory)",
  "Q&A access",
  "Slot returned on recruiter ghost",
];

/**
 * Jobs-plan picker. Free is the baseline; the two paid plans (₹149 / ₹299) open
 * the Razorpay checkout inline. Bootcamp courses are bought separately on
 * /bootcamps/checkout. The CTA on each card reflects what the buyer would get:
 * — the plan they're on shows "Current plan"
 * — any equal-or-better plan (e.g. jobs_quarterly buyer staring at the Free
 *   card, or a premium holder looking at jobs plans) shows a non-actionable
 *   "Included" pill so they can't pay for a downgrade
 * — anything strictly above the current plan opens the trusted checkout
 */
export function UpgradePlanPicker({ currentPlan, prefill }: PickerProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-3 max-w-4xl mx-auto">
      <Card title="Free" price="₹0" sub="2 lifetime applications" features={["2 lifetime applications", "Browse all jobs + courses", "Upgrade anytime"]}>
        <Cta
          state={
            currentPlan === "free"
              ? "current"
              : "covered"
          }
        />
      </Card>

      {JOBS.map(({ plan, title, cadence, badge }) => {
        const base = PLAN_PRICING[plan].amountINR * 100;
        const { totalInPaise } = computeTotalPaise({
          priceInPaise: base,
          gstPercent: GST_PERCENT,
        });
        const isCurrent = currentPlan === plan;
        const covered = planAlreadyCovered(currentPlan, plan);
        return (
          <Card
            key={plan}
            title={title}
            price={formatPaiseAsINR(base)}
            sub={`+ ${GST_PERCENT}% GST · ${formatPaiseAsINR(totalInPaise, { withPaise: true })} total · ${cadence}`}
            features={PAID_FEATURES}
            badge={badge}
            highlight={badge === "Best value"}
          >
            {isCurrent ? (
              <Cta state="current" />
            ) : covered ? (
              // Buyer is on a higher-rank plan — paying for this would shrink
              // their access, so we show "Already included" instead of a CTA.
              <Cta state="covered" />
            ) : (
              <CheckoutButton
                body={{ kind: "jobs", plan }}
                description={`unGhost ${title}`}
                successUrl={`/upgrade/success?kind=jobs&plan=${plan}`}
                label={`Get ${title}`}
                prefill={prefill}
              />
            )}
          </Card>
        );
      })}

      {currentPlan === "premium" && (
        <p className="sm:col-span-3 text-center text-body-sm text-neutral-500">
          You&apos;re on legacy Premium — unlimited applications, AI Coach, and
          every bootcamp are included until your plan expires.
        </p>
      )}
    </div>
  );
}

function Card({
  title,
  price,
  sub,
  features,
  badge,
  highlight,
  children,
}: {
  title: string;
  price: string;
  sub: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={clsx(
        "relative rounded-2xl border bg-white p-6 flex flex-col",
        highlight ? "border-brand-300 ring-2 ring-brand-100" : "border-neutral-200",
      )}
    >
      {badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-[11px] font-semibold text-white">
          {badge}
        </span>
      )}
      <h3 className="font-display text-lg font-bold text-neutral-900">{title}</h3>
      <p className="mt-2 font-display text-3xl font-extrabold text-neutral-950">{price}</p>
      <p className="mt-1 text-body-xs text-neutral-500">{sub}</p>
      <ul className="mt-5 space-y-2.5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-body-sm text-neutral-700">
            <Check size={16} className="mt-0.5 shrink-0 text-brand-500" />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Cta({ state }: { state: "current" | "covered" }) {
  return (
    <div
      className={clsx(
        "rounded-xl px-6 py-3.5 text-center text-base font-semibold",
        "bg-neutral-100 text-neutral-500",
      )}
    >
      {state === "current" ? "Current plan" : "Already included"}
    </div>
  );
}
