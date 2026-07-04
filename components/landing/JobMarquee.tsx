"use client";

import { useReducedMotion } from "framer-motion";
import { Briefcase, MapPin, Timer } from "lucide-react";

/** Per-company accent — the single splash of colour on an otherwise crisp white
 *  card. `glow` is an RGB triple used for the avatar's soft halo. */
const PALETTE = [
  { from: "#0191FC", to: "#0166C8", glow: "1,145,252" }, // blue
  { from: "#8B5CF6", to: "#6D28D9", glow: "139,92,246" }, // violet
  { from: "#10B981", to: "#059669", glow: "16,185,129" }, // emerald
  { from: "#F59E0B", to: "#D97706", glow: "245,158,11" }, // amber
  { from: "#F43F5E", to: "#E11D48", glow: "244,63,94" }, // rose
  { from: "#06B6D4", to: "#0891B2", glow: "6,182,212" }, // cyan
] as const;

interface Job {
  co: string;
  role: string;
  location: string;
  salary: string;
  /** Public SLA the recruiter committed to — the card's differentiator. */
  window: "24h" | "48h" | "72h";
  /** Work arrangement badge. */
  type: "Remote" | "Hybrid" | "On-site";
  /** Experience band for the role. */
  experience: string;
  /** Two or three headline skills for the role. */
  skills: string[];
}

const JOBS: Job[] = [
  { co: "Northwind", role: "Senior Product Engineer", location: "Bangalore", salary: "35-60 LPA", window: "48h", type: "Hybrid", experience: "5-8 yrs", skills: ["React", "Node", "AWS"] },
  { co: "Lumen Labs", role: "Frontend Lead", location: "Remote", salary: "30-50 LPA", window: "24h", type: "Remote", experience: "6-9 yrs", skills: ["React", "TypeScript", "Next.js"] },
  { co: "Vector", role: "Staff PM", location: "Mumbai", salary: "40-70 LPA", window: "72h", type: "On-site", experience: "8-12 yrs", skills: ["Strategy", "Analytics", "Roadmap"] },
  { co: "Graviton", role: "Backend Engineer", location: "Pune", salary: "25-45 LPA", window: "48h", type: "Hybrid", experience: "3-6 yrs", skills: ["Go", "Postgres", "Kafka"] },
  { co: "Solara", role: "Full-stack Developer", location: "Delhi", salary: "20-38 LPA", window: "24h", type: "Remote", experience: "2-5 yrs", skills: ["React", "Django", "MySQL"] },
  { co: "Quanta", role: "ML Engineer", location: "Hyderabad", salary: "32-55 LPA", window: "48h", type: "Hybrid", experience: "4-7 yrs", skills: ["Python", "PyTorch", "MLOps"] },
  { co: "Forge", role: "Design Engineer", location: "Remote", salary: "28-48 LPA", window: "72h", type: "Remote", experience: "3-6 yrs", skills: ["Figma", "React", "Motion"] },
  { co: "Atlas", role: "Platform Engineer", location: "Bangalore", salary: "38-65 LPA", window: "48h", type: "On-site", experience: "5-9 yrs", skills: ["K8s", "Terraform", "Go"] },
];

function JobCard({ job, index }: { job: Job; index: number }) {
  const c = PALETTE[index % PALETTE.length];
  return (
    <div className="group mr-5 inline-flex w-[380px] items-start gap-4 rounded-2xl bg-white px-6 py-5 ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_20px_45px_-18px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_28px_60px_-20px_rgba(0,0,0,0.7)]">
      <div className="relative shrink-0">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white"
          style={{
            backgroundImage: `linear-gradient(135deg, ${c.from}, ${c.to})`,
            boxShadow: `0 6px 16px rgba(${c.glow},0.4), inset 0 1px 0 rgba(255,255,255,0.35)`,
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
          <span className="h-1 w-1 shrink-0 rounded-full bg-neutral-300" />
          <span className="flex items-center gap-1">
            <Briefcase size={13} className="shrink-0 text-neutral-400" />
            {job.experience}
          </span>
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

        {/* Salary + committed reply window — the differentiator only unGhost shows. */}
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-black/[0.06] pt-3">
          <span className="text-[16px] font-bold tnum" style={{ color: c.to }}>
            {job.salary}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-600 ring-1 ring-brand-500/15">
            <Timer size={11} className="shrink-0" />
            {job.window} reply
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({
  jobs,
  reverse,
  durationS,
}: {
  jobs: Job[];
  reverse?: boolean;
  durationS: number;
}) {
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
 * Single-row ticker of sample roles. The void section's CTA lives in its
 * narrative column, so this strip only carries proof: real-shaped roles with
 * salary, skills and the committed reply window each recruiter owns.
 */
export function JobMarquee() {
  const reduce = useReducedMotion();

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
          {JOBS.slice(0, 4).map((job, i) => (
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
          <Row jobs={JOBS} durationS={110} />
        </div>
      )}
    </div>
  );
}
