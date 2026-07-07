"use client";

import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, Briefcase, MapPin, Timer } from "lucide-react";

/** Per-company accent — shades of the single committed brand blue (PRODUCT.md:
 *  one accent, no rainbow). Gradients start at brand-500 or darker so the
 *  white 24px avatar letter stays above the 3:1 large-text AA floor. */
const PALETTE = [
  { from: "#0191FC", to: "#0168BD" }, // 500 → 700
  { from: "#017FE0", to: "#004F95" }, // 600 → 800
  { from: "#0168BD", to: "#003D75" }, // 700 → 900
] as const;
const GLOW = "1,145,252";

/** The shape a ticker card renders — mapped from real jobs by the landing
 *  page, or from the illustrative fallback list below. */
export interface TickerRole {
  co: string;
  role: string;
  location: string;
  salary: string;
  /** Public SLA the recruiter committed to — the card's differentiator. */
  window: string;
  /** Work arrangement badge. */
  type: "Remote" | "Hybrid" | "On-site";
  /** Experience band for the role, e.g. "3-6 yrs". Empty = unspecified. */
  experience: string;
  /** Two or three headline skills for the role. */
  skills: string[];
}

/** Illustrative placeholders — clearly labeled in the caption when shown.
 *  Used only when the live board has too few roles to fill the strip. */
const SAMPLE_ROLES: TickerRole[] = [
  { co: "Northwind", role: "Senior Product Engineer", location: "Bangalore", salary: "35-60 LPA", window: "48h", type: "Hybrid", experience: "5-8 yrs", skills: ["React", "Node", "AWS"] },
  { co: "Lumen Labs", role: "Frontend Lead", location: "Remote", salary: "30-50 LPA", window: "24h", type: "Remote", experience: "6-9 yrs", skills: ["React", "TypeScript", "Next.js"] },
  { co: "Vector", role: "Staff PM", location: "Mumbai", salary: "40-70 LPA", window: "72h", type: "On-site", experience: "8-12 yrs", skills: ["Strategy", "Analytics", "Roadmap"] },
  { co: "Graviton", role: "Backend Engineer", location: "Pune", salary: "25-45 LPA", window: "48h", type: "Hybrid", experience: "3-6 yrs", skills: ["Go", "Postgres", "Kafka"] },
  { co: "Solara", role: "Full-stack Developer", location: "Delhi", salary: "20-38 LPA", window: "24h", type: "Remote", experience: "2-5 yrs", skills: ["React", "Django", "MySQL"] },
  { co: "Quanta", role: "ML Engineer", location: "Hyderabad", salary: "32-55 LPA", window: "48h", type: "Hybrid", experience: "4-7 yrs", skills: ["Python", "PyTorch", "MLOps"] },
  { co: "Forge", role: "Design Engineer", location: "Remote", salary: "28-48 LPA", window: "72h", type: "Remote", experience: "3-6 yrs", skills: ["Figma", "React", "Motion"] },
  { co: "Atlas", role: "Platform Engineer", location: "Bangalore", salary: "38-65 LPA", window: "48h", type: "On-site", experience: "5-9 yrs", skills: ["K8s", "Terraform", "Go"] },
];

/** Below this many live roles the strip pads with the labeled sample list —
 *  a 2-card marquee reads as emptier than an honest "sample" caption. */
const MIN_LIVE_ROLES = 4;

function JobCard({ job, index }: { job: TickerRole; index: number }): React.ReactElement {
  const c = PALETTE[index % PALETTE.length];
  return (
    <Link
      href="/jobs"
      tabIndex={-1}
      className="group mr-5 inline-flex w-[380px] items-start gap-4 rounded-2xl bg-white px-6 py-5 ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_20px_45px_-18px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_28px_60px_-20px_rgba(0,0,0,0.7)]"
    >
      <div className="relative shrink-0">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white"
          style={{
            backgroundImage: `linear-gradient(135deg, ${c.from}, ${c.to})`,
            boxShadow: `0 6px 16px rgba(${GLOW},0.4), inset 0 1px 0 rgba(255,255,255,0.35)`,
          }}
        >
          {job.co[0]}
        </div>
        {/* Live-clock indicator — the response window on this role is running. */}
        <span className="absolute -right-1 -top-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        {/* Company + work arrangement */}
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold uppercase tracking-wide text-neutral-500">
            {job.co}
          </span>
          <span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-600 ring-1 ring-black/[0.04]">
            {job.type}
          </span>
        </div>

        {/* Role */}
        <p className="mt-1 truncate text-[17px] font-bold leading-snug text-neutral-900">
          {job.role}
        </p>

        {/* Location • experience */}
        <div className="mt-2 flex items-center gap-2.5 text-[13px] text-neutral-600">
          <span className="flex items-center gap-1">
            <MapPin size={13} className="shrink-0 text-neutral-400" />
            {job.location}
          </span>
          {job.experience && (
            <>
              <span className="h-1 w-1 shrink-0 rounded-full bg-neutral-300" />
              <span className="flex items-center gap-1">
                <Briefcase size={13} className="shrink-0 text-neutral-400" />
                {job.experience}
              </span>
            </>
          )}
        </div>

        {/* Skill chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.map((s) => (
            <span
              key={s}
              className="rounded-md bg-neutral-100 px-2 py-0.5 text-[11.5px] font-medium text-neutral-600"
            >
              {s}
            </span>
          ))}
        </div>

        {/* Salary + committed reply window — the differentiator only unGhost shows.
            brand-700/800 text keeps both legible on white (AA). */}
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-black/[0.06] pt-3">
          <span className="text-[16px] font-bold tnum text-brand-700">
            {job.salary}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-800 ring-1 ring-brand-500/15">
            <Timer size={11} className="shrink-0" />
            {job.window} reply
          </span>
        </div>
      </div>
    </Link>
  );
}

function Row({
  jobs,
  reverse,
  durationS,
}: {
  jobs: TickerRole[];
  reverse?: boolean;
  durationS: number;
}): React.ReactElement {
  // Two copies → the -50% keyframe loops seamlessly.
  const doubled = [...jobs, ...jobs];
  return (
    <div className="marquee" aria-hidden>
      <div
        className={`marquee-track${reverse ? " marquee-track--reverse" : ""}`}
        style={{ animationDuration: `${durationS}s` }}
      >
        {doubled.map((job, i) => (
          <JobCard key={`${job.co}-${i}`} job={job} index={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Single-row ticker of roles with their committed reply windows.
 *
 * `roles` comes from the live board (landing page maps real jobs into
 * TickerRole); when the board is too thin the strip pads with the sample
 * list and says so in the caption — PRODUCT.md bans unlabeled fake proof.
 * The moving strip is decorative (aria-hidden, cards tabIndex -1); the
 * accessible path to the board is the caption link below it.
 */
export function JobMarquee({ roles = [] }: { roles?: TickerRole[] }): React.ReactElement {
  const reduce = useReducedMotion();
  const live = roles.length >= MIN_LIVE_ROLES;
  const shown = live ? roles : SAMPLE_ROLES;

  return (
    <div className="relative">
      {/* Soft brand glow band so the white cards read as lit, not pasted on. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-52 -translate-y-1/2 opacity-70"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 50%, rgba(1,145,252,0.18), transparent 70%)",
        }}
      />

      {reduce ? (
        <div className="flex flex-wrap justify-center gap-4 px-4">
          {shown.slice(0, 4).map((job, i) => (
            <JobCard key={`${job.co}-${i}`} job={job} index={i} />
          ))}
        </div>
      ) : (
        <div
          className="relative"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            maskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <Row jobs={shown} durationS={110} />
        </div>
      )}

      {/* Honest caption + the accessible route into the board. */}
      <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 text-center text-body-sm text-white/60">
        {live ? (
          <span>
            <span className="font-semibold text-white/80 tnum">{roles.length}</span>{" "}
            live {roles.length === 1 ? "role" : "roles"} on the board right now.
          </span>
        ) : (
          <span>Illustrative sample roles — the live board has the real thing.</span>
        )}
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 font-semibold text-brand-300 transition-colors hover:text-brand-200"
        >
          Browse the live board
          <ArrowRight size={13} />
        </Link>
      </p>
    </div>
  );
}
