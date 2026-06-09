"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Filter,
  Ghost,
  GraduationCap,
  MapPin,
  Search,
  Send,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { GlassBadge, GlassButton, GlassCard, GlassInput } from "@/components/glass";
import { InMailModal } from "@/components/recruiter/InMailModal";
import type { CandidateSearchFilters } from "@/server/store";

interface CandidateCard {
  candidateId: string;
  score: number;
  skillHits: string[];
  isAnonymous: boolean;
  publicName: string | null;
  headline: string;
  city: string | null;
  remotePref: "remote" | "hybrid" | "onsite" | null;
  yearsExperience: number | null;
  trajectory?: "actively_hunting" | "casually_exploring" | "open_to_magic";
  skills: string[];
  verifiedSkills: string[];
  topPerformer: boolean;
}

const SKILL_BANK = [
  "Python",
  "TypeScript",
  "React",
  "Go",
  "Postgres",
  "Kubernetes",
  "LLM Grounding",
  "Prompt Eng",
  "PyTorch",
];

interface Props {
  initialCredits: number;
}

export function CandidateDatabase({ initialCredits }: Props) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<CandidateSearchFilters>({});
  const [results, setResults] = useState<CandidateCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(initialCredits);
  const [outreach, setOutreach] = useState<CandidateCard | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // On mount, hydrate from a "Run now" on /recruiter/saved-searches
  // (?savedSearch=<filtersJson>); otherwise do a default open search.
  useEffect(() => {
    const raw = searchParams?.get("savedSearch");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CandidateSearchFilters & {
          query?: string;
        };
        const { query: q, ...f } = parsed;
        setQuery(q ?? "");
        setFilters(f);
        runSearch(f, q ?? "");
        return;
      } catch {
        /* malformed param — fall through to default */
      }
    }
    runSearch({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSearch(f: CandidateSearchFilters, q: string = query) {
    setLoading(true);
    try {
      const payload: CandidateSearchFilters = { ...f, query: q };
      const res = await fetch("/api/recruiter/candidates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: CandidateCard[] = await res.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  }

  async function saveSearch() {
    const name = window.prompt("Name this saved search:", "");
    if (!name?.trim()) return;
    const res = await fetch("/api/recruiter/saved-searches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        filtersJson: JSON.stringify({ ...filters, query }),
        alertFrequency: "off",
      }),
    });
    setSaveMsg(res.ok ? "Search saved ✓" : "Couldn't save the search.");
    setTimeout(() => setSaveMsg(null), 2500);
  }

  function toggleSkill(skill: string) {
    setFilters((f) => {
      const list = f.skills ?? [];
      const next = list.includes(skill)
        ? list.filter((s) => s !== skill)
        : [...list, skill];
      const out = { ...f, skills: next };
      runSearch(out);
      return out;
    });
  }

  function setFilter<K extends keyof CandidateSearchFilters>(
    key: K,
    val: CandidateSearchFilters[K],
  ) {
    setFilters((f) => {
      const out = { ...f, [key]: val };
      runSearch(out);
      return out;
    });
  }

  return (
    <div className="grid lg:grid-cols-12 gap-5">
      {/* ── Filter Rail ──────────────────────────────────────── */}
      <aside className="lg:col-span-3 space-y-4">
        <GlassCard className="!p-4">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <Filter size={11} /> Filters
          </p>

          {/* Skills */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
              Skills (any)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_BANK.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSkill(s)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    (filters.skills ?? []).includes(s)
                      ? "bg-brand-primary text-white border-brand-primary shadow-brand-glow"
                      : "bg-white/40 text-brand-muted border-brand-ink/10 hover:border-brand-primary/40"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Trajectory */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
              Trajectory
            </p>
            <select
              value={filters.trajectory ?? ""}
              onChange={(e) =>
                setFilter(
                  "trajectory",
                  (e.target.value || undefined) as CandidateSearchFilters["trajectory"],
                )
              }
              className="glass-input w-full !py-1.5 text-xs"
            >
              <option value="">Any</option>
              <option value="actively_hunting">Actively hunting</option>
              <option value="casually_exploring">Casually exploring</option>
              <option value="open_to_magic">Open to magic</option>
            </select>
          </div>

          {/* Remote pref */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
              Work mode
            </p>
            <select
              value={filters.remotePref ?? ""}
              onChange={(e) =>
                setFilter(
                  "remotePref",
                  (e.target.value || undefined) as CandidateSearchFilters["remotePref"],
                )
              }
              className="glass-input w-full !py-1.5 text-xs"
            >
              <option value="">Any</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </div>

          {/* City */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
              City
            </p>
            <GlassInput
              value={filters.city ?? ""}
              onChange={(e) => setFilter("city", e.target.value || undefined)}
              placeholder="e.g. Bengaluru"
              className="!py-1.5 text-xs"
            />
          </div>

          {/* Min YoE */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
              Min years exp
            </p>
            <GlassInput
              type="number"
              value={filters.minYearsExperience ?? ""}
              onChange={(e) =>
                setFilter(
                  "minYearsExperience",
                  e.target.value ? Number(e.target.value) : undefined,
                )
              }
              placeholder="0"
              className="!py-1.5 text-xs"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-3 border-t border-brand-ink/5">
            <Toggle
              checked={!!filters.verifiedOnly}
              onChange={(v) => setFilter("verifiedOnly", v ? true : undefined)}
              label="Verified-skill only"
            />
            <Toggle
              checked={!!filters.topPerformersOnly}
              onChange={(v) =>
                setFilter("topPerformersOnly", v ? true : undefined)
              }
              label="Top bootcamp performers"
            />
          </div>
        </GlassCard>
      </aside>

      {/* ── Results ──────────────────────────────────────────── */}
      <div className="lg:col-span-9 space-y-4">
        {/* NL search bar */}
        <GlassCard className="!p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(filters);
            }}
          >
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted z-10"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Senior Python engineers in Bangalore with 5+ years and AWS…"
                className="w-full bg-white/60 border border-brand-ink/10 rounded-xl pl-11 pr-32 py-3 text-sm text-brand-ink placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
              <GlassButton
                variant="brand"
                type="submit"
                size="sm"
                className="!absolute right-2 top-1/2 -translate-y-1/2"
                disabled={loading}
              >
                {loading ? "…" : "Search"}
              </GlassButton>
            </div>
            <p className="text-[10px] text-brand-muted mt-2 flex items-center gap-1.5">
              <Sparkles size={10} className="text-brand-primary" />
              Natural-language search · {results.length} match
              {results.length === 1 ? "" : "es"} ·{" "}
              <span className="text-brand-ink font-semibold">
                {credits} InMail credit{credits === 1 ? "" : "s"}
              </span>
            </p>
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={saveSearch}
                className="text-xs font-semibold text-brand-primary hover:underline"
              >
                + Save this search
              </button>
              {saveMsg && (
                <span className="text-xs text-emerald-600 font-semibold">
                  {saveMsg}
                </span>
              )}
            </div>
          </form>
        </GlassCard>

        {/* Result cards */}
        {loading && results.length === 0 ? (
          <GlassCard className="text-center !py-12">
            <Users
              size={28}
              className="mx-auto text-brand-muted mb-3 animate-pulse"
            />
            <p className="text-sm text-brand-muted">Searching the database…</p>
          </GlassCard>
        ) : results.length === 0 ? (
          <GlassCard className="text-center !py-12">
            <Ghost size={28} className="mx-auto text-brand-muted mb-3" />
            <p className="font-display font-bold text-brand-ink">
              Nobody matches yet
            </p>
            <p className="text-sm text-brand-muted mt-2">
              Loosen the filters or post a job to attract new candidates.
            </p>
          </GlassCard>
        ) : (
          results.map((c) => (
            <GlassCard
              key={c.candidateId}
              className="!p-5 hover:-translate-y-0.5 hover:shadow-glass-hover transition"
            >
              <div className="flex items-start gap-4 flex-wrap">
                {/* Avatar — anonymous = ghost icon */}
                <div className="grid place-items-center w-12 h-12 rounded-2xl bg-brand-gradient text-white shadow-brand-glow shrink-0">
                  {c.isAnonymous ? <Ghost size={20} /> : <Users size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {c.isAnonymous ? (
                      <GlassBadge tone="neutral">
                        <Ghost size={10} /> Anonymous · ID #
                        {c.candidateId.slice(-4)}
                      </GlassBadge>
                    ) : (
                      <p className="font-display font-bold text-base text-brand-ink">
                        {c.publicName}
                      </p>
                    )}
                    {c.topPerformer && (
                      <GlassBadge tone="warn">
                        <Trophy size={10} /> Top performer
                      </GlassBadge>
                    )}
                    {c.trajectory === "actively_hunting" && (
                      <GlassBadge tone="success">
                        Actively hunting
                      </GlassBadge>
                    )}
                  </div>
                  <p className="text-sm text-brand-ink/85">{c.headline}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-brand-muted">
                    {c.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={11} /> {c.city}
                        {c.remotePref ? ` · ${c.remotePref}` : ""}
                      </span>
                    )}
                    {c.yearsExperience !== null && (
                      <span>
                        {c.yearsExperience}{" "}
                        {c.yearsExperience === 1 ? "yr" : "yrs"} exp
                      </span>
                    )}
                  </div>
                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.skills.map((s) => (
                      <span
                        key={s}
                        className={`text-[11px] px-2 py-0.5 rounded-md ${
                          c.verifiedSkills.some(
                            (v) => v.toLowerCase() === s.toLowerCase(),
                          )
                            ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                            : "bg-brand-ink/5 text-brand-muted"
                        } font-medium`}
                      >
                        {c.verifiedSkills.some(
                          (v) => v.toLowerCase() === s.toLowerCase(),
                        ) && (
                          <CheckCircle2 size={9} className="inline mr-0.5" />
                        )}
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Score + Action */}
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                    Match
                  </p>
                  <p
                    className={`font-display font-extrabold text-2xl ${
                      c.score >= 80
                        ? "text-emerald-600"
                        : c.score >= 60
                        ? "text-brand-primary"
                        : "text-amber-600"
                    }`}
                  >
                    {c.score}%
                  </p>
                  <GlassButton
                    variant="brand"
                    size="sm"
                    onClick={() => setOutreach(c)}
                    disabled={credits <= 0}
                    className="mt-3"
                  >
                    <Send size={11} /> InMail
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {outreach && (
        <InMailModal
          candidate={outreach}
          creditsRemaining={credits}
          onClose={() => setOutreach(null)}
          onSent={(remaining) => {
            setCredits(remaining);
            setOutreach(null);
          }}
        />
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-xs text-brand-ink/85">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-brand-primary"
      />
      {label}
    </label>
  );
}
