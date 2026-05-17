import { Briefcase, AlertTriangle, CheckCircle2, Ban } from "lucide-react";
import { GlassBadge, GlassCard } from "@/components/glass";
import { listAllJobsWithCompany } from "@/server/store";
import { JobsClient } from "@/components/admin/JobsClient";

export default async function AdminJobsPage() {
  const jobs = await listAllJobsWithCompany();
  const open = jobs.filter((j) => j.active !== false).length;
  const closed = jobs.length - open;
  const zeroApps = jobs.filter((j) => j.applicationCount === 0).length;
  const popular = jobs.filter((j) => j.applicationCount >= 5).length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <GlassBadge tone="brand">
            <Briefcase size={11} /> Jobs
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Job moderation
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Force-close abusive postings · review zero-application missions for
            fraud signals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi icon={<Briefcase size={14} />} label="Open" value={open} tone="brand" />
        <Kpi icon={<Ban size={14} />} label="Closed" value={closed} tone="danger" />
        <Kpi
          icon={<AlertTriangle size={14} />}
          label="0 applications"
          value={zeroApps}
          tone="warn"
        />
        <Kpi
          icon={<CheckCircle2 size={14} />}
          label="5+ applications"
          value={popular}
          tone="success"
        />
      </div>

      <JobsClient initial={jobs} />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
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
      <div className="flex items-center justify-between mb-1.5">
        <span className={cls}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
          {label}
        </span>
      </div>
      <p className={`font-display text-2xl font-bold ${cls}`}>{value}</p>
    </GlassCard>
  );
}
