import Link from "next/link";
import {
  Briefcase,
  Target,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { GlassCard } from "@/components/glass";

interface StatBarProps {
  applicationsUsed: number;
  /** Cap under the user's plan. `-1` means unlimited (Premium). */
  applicationsLimit: number;
  activeApps: number;
  profileCompleteness: number;
  avgMatch: number;
}

/**
 * Student dashboard top stat bar — 4 KPI cards per PRD.
 */
export function StatBar({
  applicationsUsed,
  applicationsLimit,
  activeApps,
  profileCompleteness,
  avgMatch,
}: StatBarProps) {
  // Premium is unlimited (cap === -1) — never show a ceiling or upsell.
  const unlimited = applicationsLimit < 0;
  const quotaTight = !unlimited && applicationsUsed >= applicationsLimit - 1;
  const matchTone =
    avgMatch >= 75 ? "emerald" : avgMatch >= 55 ? "brand" : "amber";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Kpi
        icon={<Briefcase size={16} />}
        label={unlimited ? "Applications sent" : "Applications used"}
        value={unlimited ? applicationsUsed : `${applicationsUsed} of ${applicationsLimit}`}
        sub={
          unlimited ? (
            <span className="text-emerald-600 font-semibold">
              Unlimited · Premium
            </span>
          ) : quotaTight ? (
            <Link
              href="/upgrade"
              className="text-rose-600 font-semibold hover:underline"
            >
              Go Premium →
            </Link>
          ) : (
            <span className="text-brand-muted">free tier</span>
          )
        }
        tone={unlimited ? "success" : quotaTight ? "danger" : "brand"}
      />
      <Kpi
        icon={<Target size={16} />}
        label="Active applications"
        value={activeApps}
        sub={<span className="text-brand-muted">in-flight</span>}
        tone="brand"
      />
      <Kpi
        icon={<UserCheck size={16} />}
        label="Profile completeness"
        value={`${profileCompleteness}%`}
        sub={
          profileCompleteness < 80 ? (
            <Link
              href="/student/profile/edit"
              className="text-amber-700 font-semibold hover:underline"
            >
              Complete →
            </Link>
          ) : (
            <span className="text-emerald-600">solid</span>
          )
        }
        tone={profileCompleteness < 60 ? "warn" : "success"}
      />
      <Kpi
        icon={<TrendingUp size={16} />}
        label="Match strength"
        value={`${avgMatch}%`}
        sub={<span className="text-brand-muted">avg across feed</span>}
        tone={matchTone === "emerald" ? "success" : matchTone === "brand" ? "brand" : "warn"}
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: React.ReactNode;
  tone: "brand" | "success" | "warn" | "danger";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "danger"
      ? "text-rose-600"
      : "text-brand-primary";
  return (
    <GlassCard className="!p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={cls}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`font-display text-2xl font-bold ${cls}`}>{value}</p>
      <p className="text-[11px] mt-1">{sub}</p>
    </GlassCard>
  );
}
