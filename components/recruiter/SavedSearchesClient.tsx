"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Loader2,
  Play,
  Trash2,
} from "lucide-react";
import {
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassSelect,
} from "@/components/glass";
import type { SavedSearch } from "@/shared/types";

interface Props {
  initial: SavedSearch[];
}

export function SavedSearchesClient({ initial }: Props) {
  const router = useRouter();
  const [list, setList] = useState<SavedSearch[]>(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setFreq(id: string, alertFrequency: SavedSearch["alertFrequency"]) {
    setBusyId(id);
    try {
      await fetch(`/api/recruiter/saved-searches/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alertFrequency }),
      });
      setList((prev) =>
        prev.map((s) => (s.id === id ? { ...s, alertFrequency } : s)),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete saved search?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/recruiter/saved-searches/${id}`, {
        method: "DELETE",
      });
      setList((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  function runSearch(s: SavedSearch) {
    // Carry the saved filters to the candidate database via ?savedSearch=,
    // which CandidateDatabase parses + applies on mount.
    router.push(
      `/recruiter/candidates?savedSearch=${encodeURIComponent(s.filtersJson)}`,
    );
  }

  if (list.length === 0) {
    return (
      <GlassCard className="text-center !py-12">
        <Bell size={28} className="mx-auto text-brand-muted mb-3" />
        <p className="font-display font-bold text-brand-ink">No saved searches yet</p>
        <p className="text-sm text-brand-muted mt-2">
          Open the candidate database, tune filters, and click <em>Save search</em>{" "}
          to pin a query.
        </p>
        <Link href="/recruiter/candidates" className="btn-brand inline-flex mt-5">
          Open candidate database →
        </Link>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((s) => {
        const filters = (() => {
          try {
            return JSON.parse(s.filtersJson);
          } catch {
            return {};
          }
        })();
        const filterChips: Array<{ key: string; label: string }> = [];
        if (filters.query)
          filterChips.push({ key: "query", label: `"${filters.query}"` });
        if (filters.skills?.length)
          filterChips.push({
            key: "skills",
            label: `${filters.skills.length} skills`,
          });
        if (filters.city)
          filterChips.push({ key: "city", label: filters.city });
        if (filters.remotePref)
          filterChips.push({ key: "remote", label: filters.remotePref });
        if (filters.minYearsExperience)
          filterChips.push({
            key: "yrs",
            label: `${filters.minYearsExperience}+ yrs`,
          });
        if (filters.verifiedOnly)
          filterChips.push({ key: "verified", label: "verified only" });

        return (
          <GlassCard key={s.id} className="!p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-base text-brand-ink">
                  {s.name}
                </p>
                <p className="text-[10px] text-brand-muted mt-0.5">
                  Saved{" "}
                  {new Date(s.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                  {s.lastRunAt &&
                    ` · last run ${new Date(s.lastRunAt).toLocaleDateString("en-IN")}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <GlassSelect
                  value={s.alertFrequency}
                  onChange={(e) =>
                    setFreq(
                      s.id,
                      e.target.value as SavedSearch["alertFrequency"],
                    )
                  }
                  className="!py-1.5 text-xs w-auto"
                >
                  <option value="off">No alerts</option>
                  <option value="instant">Instant</option>
                  <option value="daily">Daily digest</option>
                  <option value="weekly">Weekly digest</option>
                </GlassSelect>
              </div>
            </div>

            {filterChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {filterChips.map((c) => (
                  <GlassBadge key={c.key} tone="neutral">
                    {c.label}
                  </GlassBadge>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-brand-ink/5">
              <GlassButton
                variant="glass"
                size="sm"
                onClick={() => remove(s.id)}
                disabled={busyId === s.id}
              >
                {busyId === s.id ? (
                  <Loader2 size={11} className="animate-spin" />
                ) : (
                  <Trash2 size={11} />
                )}
              </GlassButton>
              <GlassButton
                variant="brand"
                size="sm"
                onClick={() => runSearch(s)}
              >
                <Play size={11} /> Run now
              </GlassButton>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}
