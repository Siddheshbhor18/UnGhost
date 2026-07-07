import { Activity, Filter } from "lucide-react"
import {
  GlassBadge,
  GlassCard,
} from "@/components/glass";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { listAuditLogs, getUserById } from "@/server/store";

const ACTION_TONE: Record<string, "brand" | "warn" | "danger" | "success" | "neutral"> = {
  "user.suspend": "warn",
  "user.ban": "danger",
  "user.restore": "success",
  "bootcamp.approve": "success",
  "bootcamp.request_changes": "warn",
  "bootcamp.archive": "neutral",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { action?: string; targetType?: string };
}) {
  const logs = await listAuditLogs({
    action: searchParams.action,
    targetType:
      (searchParams.targetType as
        | "user"
        | "bootcamp"
        | "job"
        | "application"
        | "company"
        | "message"
        | "system"
        | undefined),
    limit: 200,
  });

  // Resolve actor names (Phase 2: batch via aggregation)
  const actors = await Promise.all(
    Array.from(new Set(logs.map((l) => l.actorId))).map((id) =>
      getUserById(id),
    ),
  );
  const actorName: Record<string, string> = {};
  for (const a of actors) {
    if (a) actorName[a.id] = a.name;
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <AdminPageHeader
        badge="Audit"
        title="Audit log"
        subtitle="Every admin action, append-only, 7-year retention per Indian financial-record law. Used for compliance and DPDP grievance support."
      />

      {/* Filter strip */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <Filter size={12} className="text-brand-muted" />
        <FilterChip label="All" href="/admin/audit" active={!searchParams.action} />
        <FilterChip
          label="User actions"
          href="/admin/audit?targetType=user"
          active={searchParams.targetType === "user"}
        />
        <FilterChip
          label="Bootcamp actions"
          href="/admin/audit?targetType=bootcamp"
          active={searchParams.targetType === "bootcamp"}
        />
        <FilterChip
          label="Suspensions"
          href="/admin/audit?action=user.suspend"
          active={searchParams.action === "user.suspend"}
        />
        <FilterChip
          label="Bans"
          href="/admin/audit?action=user.ban"
          active={searchParams.action === "user.ban"}
        />
        <FilterChip
          label="Bootcamp approvals"
          href="/admin/audit?action=bootcamp.approve"
          active={searchParams.action === "bootcamp.approve"}
        />
      </div>

      {logs.length === 0 ? (
        <GlassCard className="text-center !py-12">
          <Activity size={28} className="mx-auto text-brand-muted mb-3" />
          <p className="font-display font-bold text-brand-ink">No log entries yet</p>
          <p className="text-sm text-brand-muted mt-2">
            Once you moderate users or approve bootcamps, every action lands here.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="!p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-ink/5">
                <th className="px-4 py-3 font-semibold">When</th>
                <th className="font-semibold">Actor</th>
                <th className="font-semibold">Action</th>
                <th className="font-semibold">Target</th>
                <th className="font-semibold">Summary</th>
                <th className="font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-ink/5">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-white/40 transition">
                  <td className="px-4 py-3 text-xs text-brand-muted font-mono">
                    {new Date(l.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <p className="text-brand-ink font-semibold">
                      {actorName[l.actorId] ?? l.actorId.slice(-6)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-brand-muted">
                      {l.actorRole}
                    </p>
                  </td>
                  <td>
                    <GlassBadge tone={ACTION_TONE[l.action] ?? "brand"}>
                      {l.action}
                    </GlassBadge>
                  </td>
                  <td className="text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-brand-muted">
                      {l.targetType}
                    </span>
                    <p className="font-mono text-brand-ink/85">
                      {l.targetId.slice(-12)}
                    </p>
                  </td>
                  <td className="text-sm text-brand-ink/85 max-w-xs">
                    {l.summary}
                  </td>
                  <td className="text-xs text-brand-muted max-w-xs">
                    {l.reason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      <p className="text-[11px] text-brand-muted text-center">
        Showing latest {logs.length} entries · Real impl exports CSV for legal
        requests · DPDP audit retention: 7 years.
      </p>
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
        active
          ? "bg-brand-primary text-white shadow-brand-glow"
          : "bg-white/40 text-brand-muted hover:bg-white/70 hover:text-brand-ink"
      }`}
    >
      {label}
    </a>
  );
}
