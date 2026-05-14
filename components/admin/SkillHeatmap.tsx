"use client";

import type { SkillFailRow } from "@/lib/data/store";

export function SkillHeatmap({ rows }: { rows: SkillFailRow[] }) {
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const intensity = Math.min(100, r.failureRate);
        const color =
          r.failureRate >= 60 ? "var(--neon-red)" : r.failureRate >= 30 ? "var(--neon-yellow)" : "var(--neon-green)";
        return (
          <div key={r.skill} className="grid grid-cols-[160px_1fr_80px] items-center gap-3 font-mono text-xs">
            <span className="text-ink-primary truncate">{r.skill}</span>
            <div className="relative h-6 border-2 border-bg-ink bg-bg-base overflow-hidden">
              <div
                className="absolute inset-y-0 left-0"
                style={{
                  width: `${intensity}%`,
                  background: color,
                  boxShadow: `0 0 12px ${color}`,
                }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-[10px] mix-blend-difference text-white">
                {r.failures} fail / {r.attempts} attempts
              </span>
            </div>
            <span className="text-right" style={{ color }}>
              {r.failureRate}%
            </span>
          </div>
        );
      })}
      {rows.length === 0 && <p className="font-mono text-xs text-ink-muted text-center py-6">No data yet.</p>}
    </div>
  );
}
