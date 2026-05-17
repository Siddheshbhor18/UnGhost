"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Ban, RotateCcw, ExternalLink } from "lucide-react";
import clsx from "clsx";
import type { Job } from "@/shared/types";
import { GlassButton, GlassCard, GlassInput } from "@/components/glass";

type Row = Job & { companyName: string; applicationCount: number };

export function JobsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "closed" | "suspicious">(
    "all",
  );

  async function toggle(id: string, active: boolean) {
    let reason: string | undefined;
    if (active === false) {
      const r = prompt("Reason for closing this mission?");
      if (!r) return;
      reason = r;
    }
    const res = await fetch(`/api/admin/job/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: active ? "reopen" : "close",
        reason,
      }),
    });
    if (!res.ok) {
      alert("Action failed.");
      return;
    }
    setRows((list) => list.map((r) => (r.id === id ? { ...r, active } : r)));
    router.refresh();
  }

  const filtered = rows.filter((j) => {
    if (q && !j.title.toLowerCase().includes(q.toLowerCase()) &&
        !j.companyName.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "open" && j.active === false) return false;
    if (filter === "closed" && j.active !== false) return false;
    if (
      filter === "suspicious" &&
      !(j.applicationCount === 0 && j.active !== false)
    )
      return false;
    return true;
  });

  return (
    <>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"
            />
            <GlassInput
              placeholder="Search by title or company…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="!pl-9"
            />
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl bg-brand-ink/5">
          {(["all", "open", "closed", "suspicious"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize",
                filter === f
                  ? "bg-white text-brand-ink shadow-sm"
                  : "text-brand-muted hover:text-brand-ink",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="!p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-brand-muted border-b border-brand-ink/5 bg-white/40">
              <th className="px-5 py-3 font-semibold">Mission</th>
              <th className="font-semibold">Company</th>
              <th className="text-center font-semibold">Apps</th>
              <th className="text-center font-semibold">SLA</th>
              <th className="text-center font-semibold">Salary (LPA)</th>
              <th className="font-semibold">Status</th>
              <th className="text-right pr-5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-brand-muted">
                  No jobs match.
                </td>
              </tr>
            ) : (
              filtered.map((j) => (
                <tr key={j.id} className="hover:bg-white/40 transition">
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <Link
                        href={`/missions/${j.id}`}
                        className="font-semibold text-brand-primary hover:underline inline-flex items-center gap-1"
                      >
                        {j.title}
                        <ExternalLink size={10} />
                      </Link>
                      <span className="text-[11px] text-brand-muted">
                        {j.remote} · {j.location}
                      </span>
                    </div>
                  </td>
                  <td className="text-brand-ink">{j.companyName}</td>
                  <td className="text-center font-semibold">
                    <span
                      className={clsx(
                        j.applicationCount === 0 && j.active !== false
                          ? "text-amber-600"
                          : "text-brand-primary",
                      )}
                    >
                      {j.applicationCount}
                    </span>
                  </td>
                  <td className="text-center text-brand-muted">{j.slaHours}h</td>
                  <td className="text-center text-brand-muted">
                    ₹{j.salaryMin}–{j.salaryMax}
                  </td>
                  <td>
                    {j.active === false ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 border border-rose-500/30 text-[10px] font-semibold uppercase tracking-wider">
                        Closed
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 text-[10px] font-semibold uppercase tracking-wider">
                        Open
                      </span>
                    )}
                  </td>
                  <td className="text-right pr-5">
                    {j.active === false ? (
                      <GlassButton
                        size="sm"
                        variant="glass"
                        onClick={() => toggle(j.id, true)}
                      >
                        <RotateCcw size={11} /> Reopen
                      </GlassButton>
                    ) : (
                      <button
                        onClick={() => toggle(j.id, false)}
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 text-xs font-semibold"
                      >
                        <Ban size={11} /> Close
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </GlassCard>
    </>
  );
}
