import { GlassBadge, GlassButton, GlassCard } from "@/components/glass";
import { SkillHeatmap } from "@/components/admin/SkillHeatmap";
import { getSkillGapHeatmap, getAssessmentTelemetry } from "@/server/store";
import { AlertTriangle, TrendingDown, Award, Activity } from "lucide-react";

export default async function TelemetryPage() {
  const [heatmap, telemetry] = await Promise.all([
    getSkillGapHeatmap(),
    // Aggregates only — was a full `listApplications()` scan for three numbers.
    getAssessmentTelemetry(),
  ]);
  const { total, submitted, maxScore } = telemetry;
  const dropOff = total - submitted;
  const dropPct = total ? Math.round((dropOff / total) * 100) : 0;
  const top = heatmap[0];

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div>
        <GlassBadge tone="brand">Telemetry · Curriculum Intelligence</GlassBadge>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3">
          Where Students Break
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Where the Gauntlet kills people. Drives the next bootcamp we ship.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <GlassCard className="bg-rose-50/40">
          <p className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold flex items-center gap-2 mb-3">
            <TrendingDown size={14} /> Assessment Drop-off
          </p>
          <p className="font-display text-5xl font-bold text-rose-600">{dropPct}%</p>
          <p className="text-sm text-brand-muted mt-3 leading-relaxed">
            {dropOff} of {total} application starts never submit a Gauntlet
            response.
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold flex items-center gap-2 mb-3">
            <Activity size={14} /> Total Attempts
          </p>
          <p className="font-display text-5xl font-bold text-amber-600">{submitted}</p>
          <p className="text-sm text-brand-muted mt-3">
            Gauntlet responses graded by AI.
          </p>
        </GlassCard>
        <GlassCard>
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold flex items-center gap-2 mb-3">
            <Award size={14} /> Highest Grade
          </p>
          <p className="font-display text-5xl font-bold text-emerald-600">
            {maxScore}
          </p>
          <p className="text-sm text-brand-muted mt-3">
            Top assessment on the platform.
          </p>
        </GlassCard>
      </div>

      {top && top.failureRate >= 50 && (
        <GlassCard className="bg-rose-50/40">
          <GlassBadge tone="danger" className="mb-3">
            <AlertTriangle size={12} /> Actionable Alert
          </GlassBadge>
          <p className="font-display text-2xl font-bold text-rose-600 mb-2">
            Content gap detected · {top.failureRate}% failure on {top.skill}
          </p>
          <p className="text-sm text-brand-muted mb-4 leading-relaxed">
            Candidates are failing assessments on missions that require{" "}
            <b className="text-rose-700">{top.skill}</b>. Recommended action: ship a
            bootcamp.
          </p>
          <GlassButton variant="brand" size="md">
            Deploy Curriculum Request →
          </GlassButton>
        </GlassCard>
      )}

      <GlassCard>
        <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-4">
          Skill-gap Heatmap · Failure Rate by Skill
        </p>
        <SkillHeatmap rows={heatmap} />
      </GlassCard>
    </div>
  );
}
