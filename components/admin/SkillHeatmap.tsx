"use client";

import type { SkillFailRow } from "@/server/store";

export function SkillHeatmap({ rows }: { rows: SkillFailRow[] }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const intensity = Math.min(100, r.failureRate);
        const colorClass =
          r.failureRate >= 60
            ? "from-rose-500 to-rose-400"
            : r.failureRate >= 30
            ? "from-amber-500 to-amber-400"
            : "from-emerald-500 to-emerald-400";
        const labelClass =
          r.failureRate >= 60
            ? "text-rose-600"
            : r.failureRate >= 30
            ? "text-amber-600"
            : "text-emerald-600";
        return (
          <div
            key={r.skill}
            className="grid grid-cols-[160px_1fr_80px] items-center gap-3 text-sm"
          >
            <span className="text-brand-ink font-medium truncate">{r.skill}</span>
            <div className="relative h-7 rounded-full bg-brand-ink/5 overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${colorClass}`}
                style={{ width: `${intensity}%` }}
              />
              <span className="absolute inset-0 flex items-center px-3 text-[11px] font-semibold text-brand-ink">
                {r.failures} fail · {r.attempts} attempts
              </span>
            </div>
            <span className={`text-right font-display font-bold ${labelClass}`}>
              {r.failureRate}%
            </span>
          </div>
        );
      })}
      {rows.length === 0 && (
        <p className="text-sm text-brand-muted text-center py-6">No data yet.</p>
      )}
    </div>
  );
}
