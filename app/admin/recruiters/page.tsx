import { GlassBadge, GlassCard } from "@/components/glass";
import {
  listCompanies,
  listJobs,
  listUsers,
  listApplications,
  listUnlinkedRecruiters,
} from "@/server/store";
import { AssignRecruiterPanel } from "@/components/admin/AssignRecruiterPanel";

export default async function RecruitersAdmin() {
  const [cos, jobs, apps, recruiters, unlinked] = await Promise.all([
    listCompanies(),
    listJobs(),
    listApplications(),
    listUsers("recruiter"),
    listUnlinkedRecruiters(),
  ]);
  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <GlassBadge tone="brand">Recruiters</GlassBadge>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
          Companies &amp; Their Pipelines
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Every employer on unGhost — SLA compliance, applicant flow, hire rate.
        </p>
      </div>

      <AssignRecruiterPanel
        recruiters={unlinked.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          requestedCompany: r.pendingCompanyName,
        }))}
        companies={cos.map((c) => ({
          id: c.id,
          name: c.name,
          domain: c.domain,
        }))}
      />

      <div className="grid md:grid-cols-2 gap-5">
        {cos.map((co) => {
          const coJobs = jobs.filter((j) => j.companyId === co.id);
          const coApps = apps.filter((a) => coJobs.some((j) => j.id === a.jobId));
          const recs = recruiters.filter((r) => r.companyId === co.id);
          const hired = coApps.filter((a) => a.stage === "hired").length;
          const ghost = coApps.filter((a) => a.stage === "rejected").length;
          const ghostPct = coApps.length
            ? Math.round((ghost / coApps.length) * 100)
            : 0;
          return (
            <GlassCard key={co.id} interactive>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-display text-xl font-bold text-brand-ink">
                    {co.name}
                  </p>
                  <p className="text-xs text-brand-muted">{co.domain}</p>
                </div>
                <GlassBadge
                  tone={ghostPct > 30 ? "danger" : ghostPct > 15 ? "warn" : "success"}
                >
                  {ghostPct}% ghost
                </GlassBadge>
              </div>
              <p className="text-sm text-brand-ink/80 mb-4 leading-relaxed">
                {co.description}
              </p>
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Missions" value={coJobs.length} tone="brand" />
                <Stat label="Applicants" value={coApps.length} tone="brand" />
                <Stat label="Hires" value={hired} tone="success" />
                <Stat label="Team" value={recs.length} tone="warn" />
              </div>
              {recs.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-1">
                    Recruiters
                  </p>
                  <ul className="space-y-0.5 text-xs text-brand-ink/80">
                    {recs.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {r.name}
                          {r.isCompanyAdmin ? " · admin" : ""}
                        </span>
                        <span className="text-brand-muted truncate">{r.email}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {coJobs.length > 0 && (
                <ul className="mt-4 space-y-1 text-xs text-brand-muted">
                  {coJobs.slice(0, 3).map((j) => (
                    <li key={j.id} className="flex items-center justify-between">
                      <span>▸ {j.title}</span>
                      <span className="text-brand-ink/60">{j.slaHours}h SLA</span>
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "brand" | "success" | "warn";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : "text-brand-primary";
  return (
    <div className="bg-white/50 rounded-xl border border-brand-ink/5 p-3 text-center">
      <p className="text-[9px] uppercase tracking-wider text-brand-muted">{label}</p>
      <p className={`font-display text-xl font-bold mt-0.5 ${cls}`}>{value}</p>
    </div>
  );
}
