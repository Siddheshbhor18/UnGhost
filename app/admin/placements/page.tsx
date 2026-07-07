import Link from "next/link";
import { GlassBadge, GlassCard } from "@/components/glass";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { listPlacements } from "@/server/store";
import { Award } from "lucide-react";

export default async function PlacementsAdmin() {
  const placements = await listPlacements();
  const interviews = placements.filter((p) => p.stage === "interview").length;
  const offers = placements.filter((p) => p.stage === "offer").length;
  const hired = placements.filter((p) => p.stage === "hired").length;

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <AdminPageHeader
        badge="Placements"
        badgeTone="success"
        title="Interviews & offers"
        subtitle="Students who advanced past the assessment and into a real conversation with a company."
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="Interviews" value={interviews} tone="brand" />
        <Stat label="Offers" value={offers} tone="warn" />
        <Stat label="Hired" value={hired} tone="success" />
      </div>

      <GlassCard className="!p-0 overflow-x-auto">
        <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold flex items-center gap-2 px-6 pt-6 pb-4">
          <Award size={14} /> Roll Call
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-ink/5">
              <th className="px-6 py-3 font-semibold">Student</th>
              <th className="font-semibold">Company</th>
              <th className="font-semibold">Mission</th>
              <th className="font-semibold">Stage</th>
              <th className="font-semibold">Salary</th>
              <th className="font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink/5">
            {placements.map((p) => (
              <tr key={`${p.studentId}_${p.jobId}`} className="hover:bg-white/40 transition">
                <td className="px-6 py-3">
                  <Link
                    href={`/admin/students/${p.studentId}`}
                    className="text-brand-primary hover:text-brand-secondary font-semibold"
                  >
                    {p.studentName}
                  </Link>
                </td>
                <td className="text-brand-ink">{p.companyName}</td>
                <td className="text-brand-muted">{p.jobTitle}</td>
                <td>
                  <GlassBadge
                    tone={
                      p.stage === "hired"
                        ? "success"
                        : p.stage === "offer"
                        ? "warn"
                        : "brand"
                    }
                  >
                    {p.stage}
                  </GlassBadge>
                </td>
                <td className="text-emerald-600 font-semibold">
                  {p.salaryRange ?? "—"}
                </td>
                <td className="text-brand-muted">
                  {new Date(p.date).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {placements.length === 0 && (
          <p className="text-center py-12 text-sm text-brand-muted">
            No placements yet.
          </p>
        )}
      </GlassCard>
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
    <GlassCard>
      <p className="text-[10px] uppercase tracking-wider text-brand-muted">{label}</p>
      <p className={`font-display text-4xl font-bold mt-1 ${cls}`}>{value}</p>
    </GlassCard>
  );
}
