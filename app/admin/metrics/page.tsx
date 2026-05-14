import { ScoreCounter } from "@/components/arcade/ScoreCounter";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { Badge } from "@/components/arcade/Badge";
import { SectionHeader } from "@/components/arcade/SectionHeader";
import {
  getGlobalMetrics,
  listApplications,
  listJobs,
  listLiveCampaigns,
} from "@/lib/data/store";
import { Activity, Banknote, GhostIcon, Briefcase, Users as UsersIcon, GraduationCap, Award, AlertTriangle } from "lucide-react";

export default function AdminMetrics() {
  const m = getGlobalMetrics();
  const apps = listApplications();
  const jobs = listJobs();
  const recent = [...apps].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 6);

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <SectionHeader eyebrow="OVERVIEW" title="Global Metrics" color="yellow" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Banknote size={16} />} label="LIVE REVENUE" value={m.liveRevenueINR} prefix="₹" color="green" />
        <MetricCard icon={<GhostIcon size={16} />} label="GHOSTING RATE" value={m.ghostingRatePct} suffix="%" color="red" />
        <MetricCard icon={<Briefcase size={16} />} label="ACTIVE MISSIONS" value={m.activeMissions} color="pink" />
        <MetricCard icon={<UsersIcon size={16} />} label="STUDENTS" value={m.totalStudents} color="blue" />
        <MetricCard icon={<UsersIcon size={16} />} label="RECRUITERS" value={m.totalRecruiters} color="blue" />
        <MetricCard icon={<GraduationCap size={16} />} label="BOOTCAMP ENROLLMENTS" value={m.enrollments} color="yellow" />
        <MetricCard icon={<Award size={16} />} label="PLACEMENTS" value={m.placements} color="green" />
        <MetricCard icon={<Activity size={16} />} label="LIVE CAMPAIGNS" value={listLiveCampaigns("landing_hero").length + listLiveCampaigns("dashboard_top").length} color="pink" />
      </div>

      {/* Two-col layout */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ArcadeCard className="lg:col-span-2">
          <p className="font-pixel text-[10px] text-neon-blue mb-3">▸ RECENT APPLICATIONS</p>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="text-left text-ink-muted">
                  <th className="py-2">CANDIDATE</th>
                  <th>MISSION</th>
                  <th>STAGE</th>
                  <th className="text-right">MATCH</th>
                  <th className="text-right">GRADE</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-bg-ink">
                {recent.map((a) => (
                  <tr key={a.id} className="text-ink-primary">
                    <td className="py-2">{a.studentId.replace("usr_", "")}</td>
                    <td className="text-ink-muted">{(jobs.find((j) => j.id === a.jobId)?.title ?? "—").slice(0, 28)}</td>
                    <td>
                      <Badge tone={a.stage === "rejected" ? "red" : a.stage === "offer" ? "green" : "blue"}>
                        {a.stage}
                      </Badge>
                    </td>
                    <td className="text-right text-neon-green">{a.matchPct}%</td>
                    <td className="text-right">{a.assessment?.grade?.score ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ArcadeCard>

        <ArcadeCard glow="red">
          <p className="font-pixel text-[10px] text-neon-red mb-3 flex items-center gap-2">
            <AlertTriangle size={12} /> SLA BREACHES · LIVE
          </p>
          <p className="font-pixel text-3xl text-neon-red neon-text mb-2">
            {Math.round((m.ghostingRatePct / 100) * apps.length)}
          </p>
          <p className="font-mono text-xs text-ink-muted">
            applications past their SLA window. Recruiters with breaches risk visibility throttling.
          </p>
        </ArcadeCard>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  prefix,
  suffix,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  color: "green" | "pink" | "blue" | "yellow" | "red";
}) {
  const map = {
    green: "text-neon-green",
    pink: "text-neon-pink",
    blue: "text-neon-blue",
    yellow: "text-neon-yellow",
    red: "text-neon-red",
  } as const;
  const safeColor: "green" | "pink" | "blue" | "yellow" = color === "red" ? "pink" : color;
  return (
    <div className="pixel-card p-4">
      <p className={`font-mono text-[9px] text-ink-muted mb-2 flex items-center gap-1 ${map[color]}`}>{icon} {label}</p>
      <p className={`font-pixel text-2xl neon-text ${map[color]}`}>
        {prefix}<ScoreCounter value={value} color={safeColor} />{suffix}
      </p>
    </div>
  );
}
