import Link from "next/link";
import { Briefcase } from "lucide-react";

interface StatBarProps {
  applicationsUsed: number;
  /** Cap under the user's plan. `-1` means unlimited (any paid tier). */
  applicationsLimit: number;
}

/**
 * Slim applications-quota strip. This used to be a 4-KPI grid, but profile
 * completeness, match strength, and active-application counts all duplicated
 * the Daily Briefing above it. Applications-used is the only number that
 * drives an action (apply more, or upgrade), so it's all that's left here.
 */
export function StatBar({ applicationsUsed, applicationsLimit }: StatBarProps) {
  const unlimited = applicationsLimit < 0;
  const quotaTight = !unlimited && applicationsUsed >= applicationsLimit - 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-white/70 backdrop-blur border border-brand-ink/5 px-4 py-2.5 mb-6">
      <span className="flex items-center gap-2 text-sm text-brand-ink">
        <Briefcase size={15} className="text-brand-primary" />
        <span className="font-semibold tnum">
          {unlimited
            ? `${applicationsUsed} applications sent`
            : `${applicationsUsed} of ${applicationsLimit} applications used`}
        </span>
      </span>
      {unlimited ? (
        <span className="text-xs font-semibold text-emerald-600">
          Unlimited
        </span>
      ) : quotaTight ? (
        <Link
          href="/upgrade"
          className="text-xs font-semibold text-rose-600 hover:underline"
        >
          Upgrade for unlimited →
        </Link>
      ) : (
        <span className="text-xs text-brand-muted">Free tier</span>
      )}
    </div>
  );
}
