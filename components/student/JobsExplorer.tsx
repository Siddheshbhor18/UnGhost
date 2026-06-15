"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  Clock,
  Filter,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { GlassBadge, GlassCard } from "@/components/glass";
import type { Job, CompanyProfile } from "@/shared/types";
import { normalizeSkill } from "@/shared/skills";

interface JobWithMatch extends Job {
  matchPct: number;
}

interface Props {
  jobs: JobWithMatch[];
  companies: Record<string, CompanyProfile>;
  savedIds: string[];
  hasSkills: boolean;
  /** Free student who has used all applications → apply CTAs become upgrade. */
  quotaExhausted: boolean;
}

type SortKey = "match" | "newest" | "salary";
type ExpKey = "any" | "0-1" | "0-2" | "3+";

const MODES: { value: Job["remote"]; label: string }[] = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "Onsite" },
];

/** Split a "Bengaluru / Pune, Remote" location string into clean city tokens. */
function cityTokens(loc: string): string[] {
  return loc
    .split(/[/,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function JobsExplorer({
  jobs,
  companies,
  savedIds,
  hasSkills,
  quotaExhausted,
}: Props) {
  const [query, setQuery] = useState("");
  const [modes, setModes] = useState<Set<string>>(new Set());
  const [cities, setCities] = useState<Set<string>>(new Set());
  const [skills, setSkills] = useState<Set<string>>(new Set());
  const [minSalary, setMinSalary] = useState(0);
  const [exp, setExp] = useState<ExpKey>("any");
  const [strongOnly, setStrongOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>(hasSkills ? "match" : "newest");
  const [saved, setSaved] = useState<Set<string>>(new Set(savedIds));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Distinct facet values, frequency-ranked.
  const { topCities, topSkills } = useMemo(() => {
    const cityCount = new Map<string, number>();
    // Key skill facets by normalized form so "Python"/"python"/"React.js"/
    // "React" collapse to one chip; keep the first-seen raw for display.
    const skillCount = new Map<string, number>();
    const skillDisplay = new Map<string, string>();
    for (const j of jobs) {
      for (const c of cityTokens(j.location))
        cityCount.set(c, (cityCount.get(c) ?? 0) + 1);
      for (const s of j.skills) {
        const k = normalizeSkill(s);
        if (!k) continue;
        skillCount.set(k, (skillCount.get(k) ?? 0) + 1);
        if (!skillDisplay.has(k)) skillDisplay.set(k, s);
      }
    }
    const rank = (m: Map<string, number>, n: number) =>
      [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map((e) => e[0]);
    return {
      topCities: rank(cityCount, 12),
      topSkills: rank(skillCount, 24).map((k) => skillDisplay.get(k) ?? k),
    };
  }, [jobs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = jobs.filter((j) => {
      if (q) {
        const co = companies[j.companyId]?.name?.toLowerCase() ?? "";
        const hay = `${j.title} ${co} ${j.skills.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (modes.size && !modes.has(j.remote)) return false;
      if (cities.size) {
        const toks = cityTokens(j.location);
        if (!toks.some((t) => cities.has(t))) return false;
      }
      if (skills.size) {
        const js = new Set(j.skills.map(normalizeSkill));
        if (![...skills].every((s) => js.has(normalizeSkill(s)))) return false;
      }
      if (minSalary > 0 && (j.salaryMax || j.salaryMin) < minSalary)
        return false;
      if (exp !== "any") {
        if (exp === "0-1" && j.experienceMax > 1) return false;
        if (exp === "0-2" && j.experienceMax > 2) return false;
        if (exp === "3+" && j.experienceMax < 3) return false;
      }
      if (strongOnly && j.matchPct < 60) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === "match") return b.matchPct - a.matchPct;
      if (sort === "salary")
        return (b.salaryMax || b.salaryMin) - (a.salaryMax || a.salaryMin);
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
    return out;
  }, [jobs, companies, query, modes, cities, skills, minSalary, exp, strongOnly, sort]);

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, v: string) {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  }

  function onToggleSave(jobId: string) {
    const isSaved = saved.has(jobId);
    const next = new Set(saved);
    if (isSaved) next.delete(jobId);
    else next.add(jobId);
    setSaved(next);
    fetch(`/api/jobs/${jobId}/save`, {
      method: isSaved ? "DELETE" : "POST",
    }).catch(() => {});
  }

  const activeFilterCount =
    modes.size +
    cities.size +
    skills.size +
    (minSalary > 0 ? 1 : 0) +
    (exp !== "any" ? 1 : 0) +
    (strongOnly ? 1 : 0);

  function clearAll() {
    setModes(new Set());
    setCities(new Set());
    setSkills(new Set());
    setMinSalary(0);
    setExp("any");
    setStrongOnly(false);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* ── Filters ─────────────────────────────────────────── */}
      <aside
        className={`lg:col-span-3 ${
          mobileFiltersOpen ? "block" : "hidden"
        } lg:block`}
      >
        <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1 space-y-4">
          <GlassCard className="!p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-bold text-brand-ink inline-flex items-center gap-2">
                <SlidersHorizontal size={15} /> Filters
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs font-semibold text-brand-primary hover:underline"
                >
                  Clear ({activeFilterCount})
                </button>
              )}
            </div>

            {hasSkills && (
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={strongOnly}
                  onChange={(e) => setStrongOnly(e.target.checked)}
                  className="w-4 h-4 rounded accent-brand-primary"
                />
                <span className="text-sm text-brand-ink/85">
                  Strong matches only (60%+)
                </span>
              </label>
            )}

            <FilterGroup label="Work mode">
              <div className="flex flex-wrap gap-1.5">
                {MODES.map((m) => (
                  <Chip
                    key={m.value}
                    active={modes.has(m.value)}
                    onClick={() => toggle(modes, setModes, m.value)}
                  >
                    {m.label}
                  </Chip>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="Experience">
              <div className="flex flex-wrap gap-1.5">
                {(["any", "0-1", "0-2", "3+"] as ExpKey[]).map((e) => (
                  <Chip key={e} active={exp === e} onClick={() => setExp(e)}>
                    {e === "any" ? "Any" : e === "3+" ? "3+ yrs" : `${e} yrs`}
                  </Chip>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label={`Min salary · ₹${minSalary} LPA`}>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={minSalary}
                onChange={(e) => setMinSalary(+e.target.value)}
                className="w-full accent-brand-primary"
              />
            </FilterGroup>

            {topCities.length > 0 && (
              <FilterGroup label="Location">
                <div className="flex flex-wrap gap-1.5">
                  {topCities.map((c) => (
                    <Chip
                      key={c}
                      active={cities.has(c)}
                      onClick={() => toggle(cities, setCities, c)}
                    >
                      {c}
                    </Chip>
                  ))}
                </div>
              </FilterGroup>
            )}

            {topSkills.length > 0 && (
              <FilterGroup label="Skills">
                <div className="flex flex-wrap gap-1.5">
                  {topSkills.map((s) => (
                    <Chip
                      key={s}
                      active={skills.has(s)}
                      onClick={() => toggle(skills, setSkills, s)}
                    >
                      {s}
                    </Chip>
                  ))}
                </div>
              </FilterGroup>
            )}
          </GlassCard>
        </div>
      </aside>

      {/* ── Results ─────────────────────────────────────────── */}
      <div className="lg:col-span-9">
        {/* Search + sort bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, company, or skill"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/60 border border-brand-ink/10 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
            />
          </div>
          <button
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/60 border border-brand-ink/10 text-sm font-semibold text-brand-ink"
          >
            <Filter size={14} /> Filters
            {activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="py-2.5 px-3 rounded-xl bg-white/60 border border-brand-ink/10 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          >
            {hasSkills && <option value="match">Best match</option>}
            <option value="newest">Newest</option>
            <option value="salary">Highest salary</option>
          </select>
        </div>

        <p className="text-sm text-brand-muted mb-4">
          {filtered.length} job{filtered.length === 1 ? "" : "s"}
          {activeFilterCount > 0 && " match your filters"}
        </p>

        {filtered.length === 0 ? (
          <GlassCard className="text-center !py-12 text-brand-muted">
            No jobs match these filters.{" "}
            <button
              onClick={clearAll}
              className="text-brand-primary font-semibold"
            >
              Clear filters
            </button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((j) => (
              <JobCard
                key={j.id}
                job={j}
                company={companies[j.companyId]}
                saved={saved.has(j.id)}
                hasSkills={hasSkills}
                quotaExhausted={quotaExhausted}
                onToggleSave={() => onToggleSave(j.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3 border-t border-brand-ink/5 first-of-type:border-t-0">
      <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full font-medium border transition ${
        active
          ? "bg-brand-primary text-white border-brand-primary shadow-brand-glow"
          : "bg-white/50 text-brand-muted border-brand-ink/10 hover:border-brand-primary/50 hover:text-brand-primary"
      }`}
    >
      {children}
    </button>
  );
}

function JobCard({
  job,
  company,
  saved,
  hasSkills,
  quotaExhausted,
  onToggleSave,
}: {
  job: JobWithMatch;
  company?: CompanyProfile;
  saved: boolean;
  hasSkills: boolean;
  quotaExhausted?: boolean;
  onToggleSave: () => void;
}) {
  return (
    <div className="group relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleSave();
        }}
        title={saved ? "Unsave" : "Save for later"}
        className={`absolute top-3 right-3 z-10 grid place-items-center w-7 h-7 rounded-lg border transition ${
          saved
            ? "bg-amber-500 text-white border-amber-500 shadow"
            : "bg-white/70 text-brand-muted border-brand-ink/10 hover:text-amber-600 hover:border-amber-500/50"
        }`}
      >
        {saved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
      </button>

      <Link
        href={quotaExhausted ? "/upgrade?to=premium" : `/missions/${job.id}`}
        className="block h-full"
      >
        <GlassCard interactive className="h-full flex flex-col">
          <div className="flex-1 min-w-0 pr-9">
            <GlassBadge tone="neutral" className="mb-2">
              <Briefcase size={10} /> {company?.name ?? "—"}
            </GlassBadge>
            <h4 className="font-display font-bold text-brand-ink truncate">
              {job.title}
            </h4>
            <p className="text-xs text-brand-muted mt-1 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} /> {job.location} · {job.remote}
              </span>
              <span>
                ₹{job.salaryMin}–{job.salaryMax} LPA
              </span>
              {job.experienceMax > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase size={11} /> {job.experienceMin}–
                  {job.experienceMax} yrs
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {job.skills.slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-brand-ink/5 text-brand-muted font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-brand-ink/5">
            <div className="flex items-center gap-2">
              {hasSkills && (
                <span
                  className={
                    "font-display font-extrabold text-lg " +
                    (job.matchPct >= 80
                      ? "text-emerald-600"
                      : job.matchPct >= 60
                      ? "text-brand-primary"
                      : "text-brand-muted")
                  }
                >
                  {job.matchPct}
                  <span className="text-xs">% match</span>
                </span>
              )}
              <GlassBadge tone="brand">
                <Clock size={10} /> {job.slaHours}h SLA
              </GlassBadge>
            </div>
            <span
              className={`text-xs font-semibold inline-flex items-center gap-1 ${
                quotaExhausted ? "text-violet-600" : "text-brand-primary"
              }`}
            >
              {quotaExhausted ? "Go Premium" : "View & apply"}{" "}
              <ArrowRight size={12} />
            </span>
          </div>
        </GlassCard>
      </Link>
    </div>
  );
}
