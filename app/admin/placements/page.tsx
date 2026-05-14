import Link from "next/link";
import { SectionHeader } from "@/components/arcade/SectionHeader";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { Badge } from "@/components/arcade/Badge";
import { ScoreCounter } from "@/components/arcade/ScoreCounter";
import { listPlacements } from "@/lib/data/store";
import { Award } from "lucide-react";

export default function PlacementsAdmin() {
  const placements = listPlacements();
  const interviews = placements.filter((p) => p.stage === "interview").length;
  const offers = placements.filter((p) => p.stage === "offer").length;
  const hired = placements.filter((p) => p.stage === "hired").length;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <SectionHeader
        eyebrow="PLACEMENTS"
        title="Selected for Interviews & Offers"
        subtitle="Students who advanced past the Gauntlet and into a real conversation with a company."
        color="green"
      />

      <div className="grid grid-cols-3 gap-4">
        <Stat label="INTERVIEWS" value={interviews} color="pink" />
        <Stat label="OFFERS" value={offers} color="green" />
        <Stat label="HIRED" value={hired} color="yellow" />
      </div>

      <ArcadeCard>
        <p className="font-pixel text-[10px] text-neon-green mb-3 flex items-center gap-2"><Award size={12} /> ROLL CALL</p>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead className="border-b-2 border-bg-ink">
              <tr className="text-left text-ink-muted">
                <th className="py-2">STUDENT</th>
                <th>COMPANY</th>
                <th>MISSION</th>
                <th>STAGE</th>
                <th>SALARY</th>
                <th>DATE</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-bg-ink">
              {placements.map((p) => (
                <tr key={`${p.studentId}_${p.jobId}`}>
                  <td className="py-2">
                    <Link href={`/admin/students/${p.studentId}`} className="text-neon-pink hover:underline">
                      {p.studentName}
                    </Link>
                  </td>
                  <td className="text-ink-primary">{p.companyName}</td>
                  <td className="text-ink-muted">{p.jobTitle}</td>
                  <td>
                    <Badge tone={p.stage === "hired" ? "yellow" : p.stage === "offer" ? "green" : "pink"}>
                      {p.stage.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="text-neon-green">{p.salaryRange ?? "—"}</td>
                  <td className="text-ink-dim">{new Date(p.date).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {placements.length === 0 && <p className="text-center py-6 font-mono text-ink-muted">No placements yet.</p>}
        </div>
      </ArcadeCard>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: "pink" | "green" | "yellow" }) {
  return (
    <div className="pixel-card p-4">
      <p className="font-mono text-[9px] text-ink-muted mb-1">{label}</p>
      <ScoreCounter value={value} color={color} className="text-3xl" />
    </div>
  );
}
