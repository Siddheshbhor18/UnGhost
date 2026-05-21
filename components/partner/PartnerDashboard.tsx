"use client";

import { useState } from "react";
import { Check, Copy, IndianRupee, Sparkles, TrendingUp, Users } from "lucide-react";
import type { PartnerStats } from "@/shared/types";

/**
 * PartnerDashboard — what a channel partner sees on /p/[code]?key=<token>.
 *
 * Composition:
 *   • Hero card with the partner's name + shareable referral link + copy.
 *   • Four stat tiles: total signups, paid Pro, paid Premium, est earnings.
 *   • Anonymised referral table (alias only, no real names).
 *   • Footer note about contacting unGhost ops for payouts.
 */
interface Props {
  partner: {
    id: string;
    code: string;
    name: string;
    commissionPct: number;
  };
  stats: PartnerStats;
  referrals: Array<{
    alias: string;
    plan: string;
    signedUpAt: string;
  }>;
}

export function PartnerDashboard({ partner, stats, referrals }: Props) {
  // Render the absolute URL identically on server + client by reading the
  // public origin from a build-time env var. Avoids hydration mismatch +
  // the brief relative-path flicker we'd get from a window.location read.
  // Falls back to a relative path if the env isn't set (still works, just
  // not directly shareable).
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const referralLink = `${base}/?ref=${partner.code}`;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-brand-primary to-[#3454DA] text-white p-7 shadow-xl">
        <p className="text-[10px] uppercase tracking-widest font-semibold opacity-80 mb-2 inline-flex items-center gap-1.5">
          <Sparkles size={11} /> Partner
        </p>
        <h1 className="font-display font-extrabold text-3xl md:text-4xl">
          {partner.name}
        </h1>
        <p className="text-sm opacity-90 mt-1">
          Commission · {partner.commissionPct}% of paid conversions
        </p>

        <div className="mt-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4">
          <p className="text-[10px] uppercase tracking-widest font-semibold opacity-80 mb-1.5">
            Your referral link
          </p>
          <ReferralLink value={referralLink} />
          <p className="text-[11px] opacity-80 mt-2">
            Share this with students. Anyone who signs up via this link in the
            next 30 days gets attributed to you.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={<Users size={14} />}
          label="Signups"
          value={stats.signups}
        />
        <StatTile
          icon={<TrendingUp size={14} />}
          label="Pro conversions"
          value={stats.paidPro}
        />
        <StatTile
          icon={<TrendingUp size={14} />}
          label="Premium conversions"
          value={stats.paidPremium}
          highlight
        />
        <StatTile
          icon={<IndianRupee size={14} />}
          label="Estimated earnings"
          value={`₹${stats.estCommissionINR.toLocaleString("en-IN")}`}
          highlight
        />
      </div>

      {/* Referral list */}
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
          <p className="font-display font-bold text-neutral-900">Recent referrals</p>
          <span className="text-[11px] text-neutral-500">
            Last {Math.min(referrals.length, 50)} ·{" "}
            <span className="font-mono">anonymised</span>
          </span>
        </div>
        {referrals.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-neutral-500">
              No referrals yet. Share your link to start tracking conversions.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="text-left px-5 py-2.5">Alias</th>
                <th className="text-left px-5 py-2.5">Plan</th>
                <th className="text-right px-5 py-2.5">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="px-5 py-3 font-medium text-neutral-900">{r.alias}</td>
                  <td className="px-5 py-3">
                    <PlanBadge plan={r.plan} />
                  </td>
                  <td className="px-5 py-3 text-right text-neutral-600 tnum text-[12px]">
                    {r.signedUpAt
                      ? new Date(r.signedUpAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] text-neutral-500 text-center">
        For payouts or to update your details, email{" "}
        <a
          href="mailto:partners@unghost.in"
          className="text-brand-primary font-semibold hover:underline"
        >
          partners@unghost.in
        </a>
      </p>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? "border-brand-primary/30 bg-brand-primary/[0.04]"
          : "border-neutral-200 bg-white"
      }`}
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
        {icon}
        {label}
      </span>
      <p className="font-display font-extrabold text-3xl text-neutral-900 mt-2 tnum">
        {value}
      </p>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    free: { label: "Free", cls: "bg-neutral-100 text-neutral-600" },
    pro: { label: "Pro", cls: "bg-brand-primary/10 text-brand-primary" },
    premium: {
      label: "Premium",
      cls: "bg-amber-500/10 text-amber-700",
    },
  };
  const entry = map[plan] ?? map.free;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${entry.cls}`}
    >
      {entry.label}
    </span>
  );
}

function ReferralLink({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* no-op */
    }
  }
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 text-xs font-mono bg-white/15 rounded-lg px-3 py-2 truncate">
        {value}
      </code>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 px-3 py-2 text-xs font-semibold text-white transition"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
