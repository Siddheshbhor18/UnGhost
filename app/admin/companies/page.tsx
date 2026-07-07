import { Building2, BadgeCheck, ShieldAlert } from "lucide-react";
import { GlassBadge, GlassCard } from "@/components/glass";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { listAllCompaniesWithStats } from "@/server/store";
import { CompaniesClient } from "@/components/admin/CompaniesClient";

export default async function AdminCompaniesPage() {
  const companies = await listAllCompaniesWithStats();
  const total = companies.length;
  const verified = companies.filter((c) => c.verified).length;
  const suspended = companies.filter((c) => c.status === "suspended").length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6">
        <AdminPageHeader
          badge="Companies"
          title="Company moderation"
          subtitle="Verify legitimate employers, flag suspicious activity, suspend bad actors."
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi icon={<Building2 size={14} />} label="Total" value={total} tone="brand" />
        <Kpi
          icon={<BadgeCheck size={14} />}
          label="Verified"
          value={verified}
          tone="success"
        />
        <Kpi
          icon={<ShieldAlert size={14} />}
          label="Suspended"
          value={suspended}
          tone="danger"
        />
        <Kpi
          icon={<Building2 size={14} />}
          label="Avg jobs / co"
          value={
            total === 0
              ? 0
              : Math.round(
                  (companies.reduce((s, c) => s + c.jobsOpen, 0) / total) * 10,
                ) / 10
          }
          tone="brand"
        />
      </div>

      <CompaniesClient initial={companies} />
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
  value: string | number;
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
