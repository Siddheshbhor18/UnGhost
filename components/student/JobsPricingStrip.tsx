"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Infinity as InfinityIcon,
  MessagesSquare,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui";
import { formatPaiseAsINR } from "@/shared/lib/pricing";
import { PLAN_PRICING } from "@/shared/types";
import type { PurchasableJobsPlan } from "@/shared/types";

interface Props {
  /** True when the student has burned their free application allowance —
   *  the strip then leads with "Upgrade to keep applying" framing. */
  quotaExhausted: boolean;
  /** True when the student is on a paid Jobs plan already; the strip then
   *  collapses to a single "Manage plan" hint instead of selling them again. */
  onPaidPlan: boolean;
  /** Used vs lifetime free-tier limit, for the free-pill copy ("1 / 2 used"). */
  freeUsage?: { used: number; limit: number };
}

/**
 * Inline plan-pricing surface for `/student/jobs`. The dashboard already
 * pings users to upgrade indirectly (StatBar, "Go Premium" CTAs on each
 * job card), but the explicit price-per-plan was buried on `/upgrade`.
 *
 * This strip surfaces the three tiers — Free, 3-month, 1-year — at the top
 * of the jobs page so every student sees what they're paying (or not) and
 * what unlocks. The annual tier is highlighted as best value, matching the
 * landing.
 *
 * Hidden when `onPaidPlan` is true — selling to existing payers is noise.
 */
export function JobsPricingStrip({
  quotaExhausted,
  onPaidPlan,
  freeUsage,
}: Props) {
  if (onPaidPlan) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_44px_-24px_rgba(0,0,0,0.35)]">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-primary">
            Plans
          </p>
          <h2 className="mt-1 font-display text-lg font-extrabold tracking-tight text-neutral-950">
            {quotaExhausted
              ? "You're out of free applications — pick a plan to keep going."
              : "Apply free. Upgrade when it's working."}
          </h2>
        </div>
        <p className="text-body-xs text-neutral-500">
          Prices exclude 18% GST · UPI &amp; cards · cancel anytime
        </p>
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-3">
        <PlanCard
          name="Free"
          price={formatPaiseAsINR(0)}
          cadence="to start"
          features={[
            { icon: <Zap size={13} />, label: "2 applications (trial)" },
            { icon: <Check size={13} />, label: "Browse every role" },
            { icon: <Check size={13} />, label: "Slot back if ghosted" },
          ]}
          footnote={
            freeUsage
              ? `${freeUsage.used} / ${freeUsage.limit} used`
              : undefined
          }
          ctaLabel={quotaExhausted ? "Trial over" : "Current plan"}
          ctaHref={null}
        />

        <PlanCard
          name={PLAN_PRICING.jobs_quarterly.label}
          price={formatPaiseAsINR(
            PLAN_PRICING.jobs_quarterly.amountINR * 100,
          )}
          cadence="for 3 months"
          features={[
            {
              icon: <InfinityIcon size={13} />,
              label: "Unlimited applications",
            },
            { icon: <Sparkles size={13} />, label: "AI Coach on every apply" },
            {
              icon: <MessagesSquare size={13} />,
              label: "Q&A with recruiters",
            },
          ]}
          ctaLabel="Get 3 months"
          ctaHref={hrefFor("jobs_quarterly")}
        />

        <PlanCard
          name={PLAN_PRICING.jobs_annual.label}
          price={formatPaiseAsINR(PLAN_PRICING.jobs_annual.amountINR * 100)}
          cadence="for 12 months"
          features={[
            {
              icon: <InfinityIcon size={13} />,
              label: "Unlimited applications",
            },
            { icon: <Sparkles size={13} />, label: "AI Coach on every apply" },
            {
              icon: <MessagesSquare size={13} />,
              label: "Q&A with recruiters",
            },
          ]}
          ctaLabel="Get 1 year"
          ctaHref={hrefFor("jobs_annual")}
          highlight="Best value"
        />
      </div>
    </section>
  );
}

function hrefFor(plan: PurchasableJobsPlan): string {
  return `/upgrade?plan=${plan}`;
}

interface Feature {
  icon: React.ReactNode;
  label: string;
}

function PlanCard({
  name,
  price,
  cadence,
  features,
  ctaLabel,
  ctaHref,
  highlight,
  footnote,
}: {
  name: string;
  price: string;
  cadence: string;
  features: readonly Feature[];
  ctaLabel: string;
  /** Null = render as a disabled "current plan" indicator. */
  ctaHref: string | null;
  /** When set, the card is the highlighted "Best value" plan. */
  highlight?: string;
  /** Small caption under the price (e.g. usage indicator). */
  footnote?: string;
}) {
  return (
    <div
      className={[
        "relative flex flex-col rounded-xl p-4 ring-1 transition",
        highlight
          ? "bg-gradient-to-b from-brand-50 to-white ring-brand-300 shadow-[0_10px_30px_-12px_rgba(1,145,252,0.35)]"
          : "bg-white ring-neutral-200/80",
      ].join(" ")}
    >
      {highlight ? (
        <span className="absolute -top-2 right-4 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-brand-glow">
          {highlight}
        </span>
      ) : null}

      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-semibold text-neutral-700">{name}</p>
        {footnote ? (
          <span className="text-[10.5px] font-semibold text-neutral-400">
            {footnote}
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-display text-2xl font-extrabold tracking-tight tnum text-neutral-950">
        {price}
        <span className="ml-1 text-[11px] font-normal text-neutral-400">
          {cadence}
        </span>
      </p>

      <ul className="mt-3 space-y-1.5">
        {features.map((f) => (
          <li
            key={f.label}
            className="flex items-start gap-2 text-[12.5px] text-neutral-700"
          >
            <span className="mt-[2px] shrink-0 text-brand-primary">{f.icon}</span>
            <span>{f.label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        {ctaHref ? (
          <Link href={ctaHref}>
            <Button
              variant={highlight ? "primary" : "secondary"}
              size="sm"
              fullWidth
              trailingIcon={<ArrowRight size={13} />}
            >
              {ctaLabel}
            </Button>
          </Link>
        ) : (
          <Button variant="ghost" size="sm" fullWidth disabled>
            {ctaLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
