import { SectionHeader } from "@/components/arcade/SectionHeader";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { Badge } from "@/components/arcade/Badge";
import { PixelButton } from "@/components/arcade/PixelButton";
import { ScoreCounter } from "@/components/arcade/ScoreCounter";
import { SkillHeatmap } from "@/components/admin/SkillHeatmap";
import { getSkillGapHeatmap, listApplications } from "@/lib/data/store";
import { AlertTriangle, TrendingDown } from "lucide-react";

export default function TelemetryPage() {
  const heatmap = getSkillGapHeatmap();
  const apps = listApplications();
  const submitted = apps.filter((a) => a.assessment).length;
  const dropOff = apps.length - submitted;
  const dropPct = apps.length ? Math.round((dropOff / apps.length) * 100) : 0;

  const top = heatmap[0];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <SectionHeader
        eyebrow="TELEMETRY · CURRICULUM INTELLIGENCE"
        title="Where Students Break"
        subtitle="Where the Gauntlet kills people. Drives the next bootcamp we ship."
        color="pink"
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <ArcadeCard glow="red">
          <p className="font-pixel text-[10px] text-neon-red mb-3 flex items-center gap-2">
            <TrendingDown size={12} /> ASSESSMENT DROP-OFF
          </p>
          <ScoreCounter value={dropPct} suffix="%" color="pink" className="text-4xl block mb-2" />
          <p className="font-mono text-xs text-ink-muted">
            {dropOff} of {apps.length} application starts never submit a Gauntlet response.
          </p>
        </ArcadeCard>
        <ArcadeCard glow="yellow">
          <p className="font-pixel text-[10px] text-neon-yellow mb-3">▸ TOTAL ATTEMPTS</p>
          <ScoreCounter value={submitted} color="yellow" className="text-4xl block mb-2" />
          <p className="font-mono text-xs text-ink-muted">Gauntlet responses graded by AI.</p>
        </ArcadeCard>
        <ArcadeCard glow="green">
          <p className="font-pixel text-[10px] text-neon-green mb-3">▸ HIGHEST GRADE</p>
          <ScoreCounter
            value={Math.max(0, ...apps.map((a) => a.assessment?.grade?.score ?? 0))}
            color="green"
            className="text-4xl block mb-2"
          />
          <p className="font-mono text-xs text-ink-muted">Top assessment on the platform.</p>
        </ArcadeCard>
      </div>

      {top && top.failureRate >= 50 && (
        <ArcadeCard glow="red">
          <Badge tone="red" className="mb-2"><AlertTriangle size={10} /> ACTIONABLE ALERT</Badge>
          <p className="font-pixel text-base text-neon-red neon-text mb-2">
            CONTENT GAP DETECTED · {top.failureRate}% FAILURE ON {top.skill.toUpperCase()}
          </p>
          <p className="font-mono text-sm text-ink-muted mb-4">
            Candidates are failing assessments on missions that require <b className="text-neon-red">{top.skill}</b>. Recommended action: ship a bootcamp.
          </p>
          <PixelButton variant="red" size="md">
            Deploy Curriculum Request →
          </PixelButton>
        </ArcadeCard>
      )}

      <ArcadeCard>
        <p className="font-pixel text-[10px] text-neon-blue mb-3">▸ SKILL-GAP HEATMAP · FAILURE RATE BY SKILL</p>
        <SkillHeatmap rows={heatmap} />
      </ArcadeCard>
    </div>
  );
}
