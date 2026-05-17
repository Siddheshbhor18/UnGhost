import { GlassBadge, GlassCard } from "@/components/glass";
import {
  getGlobalMetrics,
  listApplications,
  listJobs,
  listLiveCampaigns,
} from "@/server/store";
import {
  Activity,
  Banknote,
  Ghost,
  Briefcase,
  Users as UsersIcon,
  GraduationCap,
  Award,
  AlertTriangle,
} from "lucide-react";

export default async function AdminMetrics() {
  const [m, apps, jobs, heroCamps, dashCamps] = await Promise.all([
    getGlobalMetrics(),
    listApplications(),
    listJobs(),
    listLiveCampaigns("landing_hero"),
    listLiveCampaigns("dashboard_top"),
  ]);
  const recent = [...apps]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);
  const breaches = Math.round((m.ghostingRatePct / 100) * apps.length);

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div>
        <GlassBadge tone="warn">Overview</GlassBadge>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
          Global Metrics
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Live signal across the entire platform.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          icon={<Banknote size={18} />}
          label="Live Revenue"
          value={m.liveRevenueINR}
          prefix="₹"
          tone="success"
        />
        <Metric
          icon={<Ghost size={18} />}
          label="Ghosting Rate"
          value={m.ghostingRatePct}
          suffix="%"
          tone={m.ghostingRatePct > 20 ? "danger" : "warn"}
        />
        <Metric
          icon={<Briefcase size={18} />}
          label="Active Missions"
          value={m.activeMissions}
          tone="brand"
        />
        <Metric
          icon={<UsersIcon size={18} />}
          label="Students"
          value={m.totalStudents}
          tone="brand"
        />
        <Metric
          icon={<UsersIcon size={18} />}
          label="Recruiters"
          value={m.totalRecruiters}
          tone="brand"
        />
        <Metric
          icon={<GraduationCap size={18} />}
          label="Bootcamp Enrollments"
          value={m.enrollments}
          tone="warn"
        />
        <Metric
          icon={<Award size={18} />}
          label="Placements"
          value={m.placements}
          tone="success"
        />
        <Metric
          icon={<Activity size={18} />}
          label="Live Campaigns"
          value={heroCamps.length + dashCamps.length}
          tone="brand"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="lg:col-span-2">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-4">
            Recent Applications
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-ink/5">
                  <th className="py-3 font-semibold">Candidate</th>
                  <th className="font-semibold">Mission</th>
                  <th className="font-semibold">Stage</th>
                  <th className="text-right font-semibold">Match</th>
                  <th className="text-right font-semibold">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-ink/5">
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td className="py-3 text-brand-ink">
                      {a.studentId.replace("usr_", "")}
                    </td>
                    <td className="text-brand-muted">
                      {(jobs.find((j) => j.id === a.jobId)?.title ?? "—").slice(0, 28)}
                    </td>
                    <td>
                      <GlassBadge
                        tone={
                          a.stage === "rejected"
                            ? "danger"
                            : a.stage === "offer" || a.stage === "hired"
                            ? "success"
                            : "brand"
                        }
                      >
                        {a.stage.replace("_", " ")}
                      </GlassBadge>
                    </td>
                    <td className="text-right font-semibold text-emerald-600">
                      {a.matchPct}%
                    </td>
                    <td className="text-right text-brand-ink">
                      {a.assessment?.grade?.score ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <GlassCard className="bg-rose-50/40">
          <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> SLA Breaches · Live
          </p>
          <p className="font-display text-5xl font-bold text-rose-600">{breaches}</p>
          <p className="text-sm text-brand-muted mt-3 leading-relaxed">
            applications past their SLA window. Recruiters with breaches risk visibility
            throttling — anti-ghost engine running.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  prefix,
  suffix,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
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
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <span className={cls}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`font-display text-3xl font-bold ${cls}`}>
        {prefix}
        {value.toLocaleString()}
        {suffix}
      </p>
    </GlassCard>
  );
}
