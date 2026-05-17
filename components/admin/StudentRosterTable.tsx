"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Application, Bootcamp, User } from "@/shared/types";
import { GlassBadge, GlassButton, GlassCard, GlassInput, GlassSelect } from "@/components/glass";
import { Search, Download, ChevronRight } from "lucide-react";

interface Props {
  students: User[];
  applications: Application[];
  bootcamps: Bootcamp[];
}

export function StudentRosterTable({ students, applications, bootcamps }: Props) {
  const [q, setQ] = useState("");
  const [traj, setTraj] = useState<
    "all" | "actively_hunting" | "casually_exploring" | "open_to_magic"
  >("all");

  const enriched = useMemo(() => {
    return students
      .filter((s) => s.profile)
      .map((s) => {
        const apps = applications.filter((a) => a.studentId === s.id);
        const interviews = apps.filter((a) =>
          ["interview", "offer", "hired"].includes(a.stage),
        ).length;
        const offers = apps.filter(
          (a) => a.stage === "offer" || a.stage === "hired",
        ).length;
        const hired = apps.filter((a) => a.stage === "hired").length;
        const avgMatch = apps.length
          ? Math.round(apps.reduce((acc, a) => acc + a.matchPct, 0) / apps.length)
          : 0;
        const topScore = Math.max(0, ...apps.map((a) => a.assessment?.grade?.score ?? 0));
        const enrolled = bootcamps.filter((b) =>
          b.enrolledStudentIds.includes(s.id),
        ).length;
        // Current interview phase (highest stage reached)
        const stageRank: Record<string, number> = {
          new_matches: 1,
          under_review: 2,
          interview: 3,
          offer: 4,
          hired: 5,
          rejected: 0,
        };
        const phase = apps.reduce<string>((best, a) => {
          return (stageRank[a.stage] ?? 0) > (stageRank[best] ?? 0) ? a.stage : best;
        }, "new_matches");
        return {
          user: s,
          apps,
          interviews,
          offers,
          hired,
          avgMatch,
          topScore,
          enrolled,
          phase,
        };
      });
  }, [students, applications, bootcamps]);

  const filtered = enriched.filter((r) => {
    const matchesQ =
      !q ||
      r.user.name.toLowerCase().includes(q.toLowerCase()) ||
      r.user.email.toLowerCase().includes(q.toLowerCase()) ||
      r.user.profile?.skills.some((s) => s.toLowerCase().includes(q.toLowerCase()));
    const matchesT = traj === "all" || r.user.profile?.trajectory === traj;
    return matchesQ && matchesT;
  });

  function exportCSV() {
    const rows = [
      [
        "Name",
        "Email",
        "City",
        "Trajectory",
        "Skills",
        "Verified",
        "Bootcamps",
        "Apps",
        "Interviews",
        "Offers",
        "Hired",
        "Phase",
        "AvgMatch",
        "TopGrade",
      ],
      ...filtered.map((r) => [
        r.user.name,
        r.user.email,
        r.user.profile?.city ?? "",
        r.user.profile?.trajectory ?? "",
        r.user.profile?.skills.join(";") ?? "",
        r.user.profile?.verifiedSkills.length ?? 0,
        r.enrolled,
        r.apps.length,
        r.interviews,
        r.offers,
        r.hired,
        r.phase,
        r.avgMatch,
        r.topScore,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "unghost-roster.csv";
    a.click();
  }

  function phaseTone(p: string): "brand" | "warn" | "success" | "danger" | "neutral" {
    if (p === "hired" || p === "offer") return "success";
    if (p === "interview") return "warn";
    if (p === "rejected") return "danger";
    return "brand";
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted z-10"
          />
          <GlassInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, skill…"
            className="pl-10"
          />
        </div>
        <GlassSelect
          value={traj}
          onChange={(e) => setTraj(e.target.value as typeof traj)}
          className="w-auto"
        >
          <option value="all">All trajectories</option>
          <option value="actively_hunting">Actively Hunting</option>
          <option value="casually_exploring">Casually Exploring</option>
          <option value="open_to_magic">Open to Magic</option>
        </GlassSelect>
        <GlassButton variant="glass" size="md" onClick={exportCSV}>
          <Download size={14} /> Export CSV
        </GlassButton>
        <span className="ml-auto text-xs text-brand-muted">
          {filtered.length} of {enriched.length}
        </span>
      </div>

      <GlassCard className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-ink/5">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="font-semibold">Trajectory</th>
              <th className="font-semibold">Phase</th>
              <th className="text-center font-semibold">Skills</th>
              <th className="text-center font-semibold">Verified</th>
              <th className="text-center font-semibold">Camps</th>
              <th className="text-center font-semibold">Apps</th>
              <th className="text-right font-semibold">Avg Match</th>
              <th className="text-right font-semibold">Top Grade</th>
              <th className="px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink/5">
            {filtered.map((r) => (
              <tr key={r.user.id} className="hover:bg-white/40 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <p className="text-brand-ink font-semibold">
                      {r.user.name}
                    </p>
                    {r.user.status === "suspended" && (
                      <GlassBadge tone="warn">Suspended</GlassBadge>
                    )}
                    {r.user.status === "banned" && (
                      <GlassBadge tone="danger">Banned</GlassBadge>
                    )}
                  </div>
                  <p className="text-xs text-brand-muted">{r.user.email}</p>
                </td>
                <td>
                  <GlassBadge
                    tone={
                      r.user.profile?.trajectory === "actively_hunting"
                        ? "success"
                        : r.user.profile?.trajectory === "open_to_magic"
                        ? "brand"
                        : "neutral"
                    }
                  >
                    {r.user.profile?.trajectory?.split("_")[0]}
                  </GlassBadge>
                </td>
                <td>
                  <GlassBadge tone={phaseTone(r.phase)}>
                    {r.phase.replace("_", " ")}
                  </GlassBadge>
                </td>
                <td className="text-center text-brand-ink">{r.user.profile?.skills.length}</td>
                <td className="text-center text-emerald-600 font-semibold">
                  {r.user.profile?.verifiedSkills.length}
                </td>
                <td className="text-center text-amber-600 font-semibold">{r.enrolled}</td>
                <td className="text-center text-brand-ink">{r.apps.length}</td>
                <td className="text-right text-brand-primary font-semibold">
                  {r.avgMatch}%
                </td>
                <td className="text-right text-brand-ink">{r.topScore || "—"}</td>
                <td className="px-3">
                  <Link
                    href={`/admin/students/${r.user.id}`}
                    className="inline-flex items-center gap-1 text-brand-primary hover:text-brand-secondary text-xs font-semibold"
                  >
                    View <ChevronRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-brand-muted py-12">No matches.</p>
        )}
      </GlassCard>
    </div>
  );
}
