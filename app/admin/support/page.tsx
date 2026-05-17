import { LifeBuoy, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { GlassBadge, GlassCard } from "@/components/glass";
import { listSupportTickets } from "@/server/store";
import { SupportClient } from "@/components/admin/SupportClient";

export default async function AdminSupportPage() {
  const tickets = await listSupportTickets();
  const open = tickets.filter((t) => t.status === "open").length;
  const inProgress = tickets.filter((t) => t.status === "in_progress").length;
  const resolved = tickets.filter((t) => t.status === "resolved").length;
  const urgent = tickets.filter(
    (t) => t.priority === "urgent" && (t.status === "open" || t.status === "in_progress"),
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <GlassBadge tone="brand">
            <LifeBuoy size={11} /> Support
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Support tickets
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Triage queue · escalate urgent · close resolved. SLA: respond in 24h.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi
          icon={<AlertTriangle size={14} />}
          label="Open"
          value={open}
          tone="warn"
        />
        <Kpi icon={<Clock size={14} />} label="In progress" value={inProgress} tone="brand" />
        <Kpi
          icon={<CheckCircle2 size={14} />}
          label="Resolved"
          value={resolved}
          tone="success"
        />
        <Kpi
          icon={<AlertTriangle size={14} />}
          label="Urgent live"
          value={urgent}
          tone="danger"
        />
      </div>

      <SupportClient initial={tickets} />
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
