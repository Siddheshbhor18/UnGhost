"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Application, Bootcamp, User } from "@/lib/data/types";
import { Badge } from "@/components/arcade/Badge";
import { Search, Download } from "lucide-react";

interface Props {
  students: User[];
  applications: Application[];
  bootcamps: Bootcamp[];
}

export function StudentRosterTable({ students, applications, bootcamps }: Props) {
  const [q, setQ] = useState("");
  const [traj, setTraj] = useState<"all" | "actively_hunting" | "casually_exploring" | "open_to_magic">("all");

  const enriched = useMemo(() => {
    return students
      .filter((s) => s.profile)
      .map((s) => {
        const apps = applications.filter((a) => a.studentId === s.id);
        const interviews = apps.filter((a) => ["interview", "offer", "hired"].includes(a.stage)).length;
        const offers = apps.filter((a) => a.stage === "offer" || a.stage === "hired").length;
        const hired = apps.filter((a) => a.stage === "hired").length;
        const avgMatch = apps.length
          ? Math.round(apps.reduce((acc, a) => acc + a.matchPct, 0) / apps.length)
          : 0;
        const topScore = Math.max(0, ...apps.map((a) => a.assessment?.grade?.score ?? 0));
        const enrolled = bootcamps.filter((b) => b.enrolledStudentIds.includes(s.id)).length;
        return { user: s, apps, interviews, offers, hired, avgMatch, topScore, enrolled };
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
      ["Name", "Email", "City", "Trajectory", "Skills", "Verified", "Bootcamps", "Apps", "Interviews", "Offers", "Hired", "AvgMatch", "TopGrade"],
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
        r.avgMatch,
        r.topScore,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "noghost-roster.csv";
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, skill…"
            className="pixel-input w-full pl-9"
          />
        </div>
        <select value={traj} onChange={(e) => setTraj(e.target.value as typeof traj)} className="pixel-input">
          <option value="all">All trajectories</option>
          <option value="actively_hunting">Actively Hunting</option>
          <option value="casually_exploring">Casually Exploring</option>
          <option value="open_to_magic">Open to Magic</option>
        </select>
        <button
          onClick={exportCSV}
          className="border-2 border-neon-yellow text-neon-yellow px-3 py-2 font-pixel text-[10px] hover:bg-neon-yellow hover:text-black transition-colors flex items-center gap-2"
        >
          <Download size={12} /> EXPORT CSV
        </button>
        <span className="ml-auto font-mono text-[10px] text-ink-muted">{filtered.length} of {enriched.length}</span>
      </div>

      <div className="pixel-card overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead className="border-b-2 border-bg-ink">
            <tr className="text-left text-ink-muted">
              <th className="px-3 py-2">NAME</th>
              <th>TRAJECTORY</th>
              <th className="text-center">SKILLS</th>
              <th className="text-center">VERIFIED</th>
              <th className="text-center">BOOTCAMPS</th>
              <th className="text-center">APPS</th>
              <th className="text-center">INTERVIEWS</th>
              <th className="text-center">OFFERS</th>
              <th className="text-right">AVG MATCH</th>
              <th className="text-right">TOP GRADE</th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-bg-ink">
            {filtered.map((r) => (
              <tr key={r.user.id} className="hover:bg-bg-ink/40 transition-colors">
                <td className="px-3 py-2">
                  <p className="text-ink-primary">{r.user.name}</p>
                  <p className="text-[10px] text-ink-dim">{r.user.email}</p>
                </td>
                <td>
                  <Badge tone={r.user.profile?.trajectory === "actively_hunting" ? "green" : r.user.profile?.trajectory === "open_to_magic" ? "purple" : "blue"}>
                    {r.user.profile?.trajectory?.split("_")[0]}
                  </Badge>
                </td>
                <td className="text-center text-ink-primary">{r.user.profile?.skills.length}</td>
                <td className="text-center text-neon-green">{r.user.profile?.verifiedSkills.length}</td>
                <td className="text-center text-neon-yellow">{r.enrolled}</td>
                <td className="text-center text-ink-primary">{r.apps.length}</td>
                <td className="text-center text-neon-pink">{r.interviews}</td>
                <td className="text-center text-neon-green">{r.offers}</td>
                <td className="text-right text-neon-blue">{r.avgMatch}%</td>
                <td className="text-right text-neon-yellow">{r.topScore || "—"}</td>
                <td className="px-3">
                  <Link href={`/admin/students/${r.user.id}`} className="text-neon-pink hover:underline text-[10px]">
                    VIEW →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center font-mono text-xs text-ink-muted py-8">No matches.</p>
        )}
      </div>
    </div>
  );
}
