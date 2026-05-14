import { SectionHeader } from "@/components/arcade/SectionHeader";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { Badge } from "@/components/arcade/Badge";
import { listCompanies, listJobs, listUsers, listApplications } from "@/lib/data/store";

export default function RecruitersAdmin() {
  const cos = listCompanies();
  const jobs = listJobs();
  const apps = listApplications();
  const recruiters = listUsers("recruiter");
  return (
    <div className="p-6 space-y-6 max-w-7xl">
      <SectionHeader eyebrow="RECRUITERS" title="Companies & Their Pipelines" color="pink" />
      <div className="grid md:grid-cols-2 gap-4">
        {cos.map((co) => {
          const coJobs = jobs.filter((j) => j.companyId === co.id);
          const coApps = apps.filter((a) => coJobs.some((j) => j.id === a.jobId));
          const recs = recruiters.filter((r) => r.companyId === co.id);
          return (
            <ArcadeCard key={co.id} glow="pink">
              <div className="flex items-start justify-between mb-2">
                <p className="font-pixel text-sm text-neon-pink">{co.name}</p>
                <Badge tone="muted">{co.domain}</Badge>
              </div>
              <p className="font-mono text-xs text-ink-muted mb-3">{co.description}</p>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <Stat label="MISSIONS" value={coJobs.length} color="text-neon-pink" />
                <Stat label="APPLICANTS" value={coApps.length} color="text-neon-blue" />
                <Stat label="RECRUITERS" value={recs.length} color="text-neon-green" />
              </div>
              {coJobs.length > 0 && (
                <ul className="mt-3 space-y-1 font-mono text-[11px] text-ink-muted">
                  {coJobs.slice(0, 3).map((j) => (
                    <li key={j.id}>▸ {j.title} · {j.slaHours}h SLA</li>
                  ))}
                </ul>
              )}
            </ArcadeCard>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border-2 border-bg-ink p-2 text-center">
      <p className="text-[9px] text-ink-muted">{label}</p>
      <p className={`font-pixel text-lg ${color}`}>{value}</p>
    </div>
  );
}
