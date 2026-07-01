"use client";

import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { MapPin } from "lucide-react";

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
  skills: string[];
}

const JOBS: Job[] = [
  { co: "Northwind", role: "Senior Product Engineer", location: "Bangalore", salary: "35–60 LPA", skills: ["React", "Node", "PG"] },
  { co: "Lumen Labs", role: "Frontend Lead", location: "Remote", salary: "30–50 LPA", skills: ["React", "TS", "Next"] },
  { co: "Vector", role: "Staff PM", location: "Mumbai", salary: "40–70 LPA", skills: ["API", "B2B", "SQL"] },
  { co: "Graviton", role: "Backend Engineer", location: "Pune", salary: "25–45 LPA", skills: ["Go", "K8s", "Redis"] },
  { co: "Solara", role: "Full-stack Developer", location: "Delhi", salary: "20–38 LPA", skills: ["React", "Python", "Docker"] },
  { co: "Quanta", role: "ML Engineer", location: "Hyderabad", salary: "32–55 LPA", skills: ["PyTorch", "LLM", "AWS"] },
  { co: "Forge", role: "Design Engineer", location: "Remote", salary: "28–48 LPA", skills: ["Figma", "CSS", "Motion"] },
  { co: "Atlas", role: "Platform Engineer", location: "Bangalore", salary: "38–65 LPA", skills: ["Rust", "gRPC", "GCP"] },
];

function JobCard({ job, index }: { job: Job; index: number }) {
  const c = PALETTE[index % PALETTE.length];
  return (
    <div className="group mr-4 inline-flex w-[340px] items-center gap-3.5 rounded-2xl bg-white px-5 py-4 ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(0,0,0,0.05),0_20px_45px_-18px_rgba(0,0,0,0.55)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_28px_60px_-20px_rgba(0,0,0,0.7)]">
      <div className="relative shrink-0">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white"
          style={{
            backgroundImage: `linear-gradient(135deg, ${c.from}, ${c.to})`,
            boxShadow: `0 6px 16px rgba(${c.glow},0.4), inset 0 1px 0 rgba(255,255,255,0.35)`,
          }}
        >
          {job.co[0]}
        </div>
        <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-neutral-900">
            {job.role}
          </p>
          <p className="shrink-0 text-[15px] font-bold tnum" style={{ color: c.to }}>
            {job.salary}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <p className="flex min-w-0 flex-1 items-center gap-1 text-[12.5px] text-neutral-500">
            <MapPin size={11} className="shrink-0 text-neutral-400" />
            <span className="truncate">
              <span className="font-medium text-neutral-700">{job.co}</span> • {job.location}
            </span>
          </p>
          <div className="hidden shrink-0 gap-1.5 sm:flex">
            {job.skills.slice(0, 2).map((s) => (
              <span
                key={s}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10.5px] font-medium text-neutral-600 ring-1 ring-black/[0.04]"
              >
                {s}
              </span>
            ))}
          </div>
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

export function JobMarquee() {
  const reduce = useReducedMotion();
  const rowA = JOBS.slice(0, 4);
  const rowB = JOBS.slice(4);

  return (
    <div className="relative mt-16">
      {/* Soft brand glow band so the white cards read as lit, not pasted on. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-48 -translate-y-1/2 opacity-70"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 50%, rgba(1,145,252,0.18), transparent 70%)",
        }}
      />

      <div className="mb-10 text-center">
        <Link
          href="/signup?next=/student/jobs"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-500/40 transition-all duration-200 hover:bg-brand-600 hover:shadow-brand-500/60 active:scale-[0.98]"
        >
          See open roles
        </Link>
      </div>
      <p className="mb-8 text-center text-[12px] text-white/45">
        Sample roles, shown for illustration. Real openings appear once you sign up.
      </p>

      {reduce ? (
        <div className="flex flex-wrap justify-center gap-4">
          {JOBS.map((job, i) => (
            <JobCard key={`${job.co}-${i}`} job={job} index={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <Row jobs={rowA} durationS={55} />
          <Row jobs={rowB} durationS={48} reverse />
        </div>
      )}
    </div>
  );
}
