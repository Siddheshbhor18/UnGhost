import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  BadgeCheck,
  MapPin,
  RotateCcw,
  Send,
  Timer,
} from "lucide-react";
import { authOptions } from "@/server/auth";
import { listJobs, listCompanies } from "@/server/store";
import type { CompanyProfile, Job } from "@/shared/types";
import { GlassNavbar } from "@/components/glass";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { SiteFooter } from "@/components/landing/SiteFooter";

export const metadata: Metadata = {
  title: "Live jobs with reply deadlines · unGhost",
  description:
    "Every role on unGhost carries a public reply window the recruiter committed to. Browse the live board free; create an account only when you apply.",
};

const REMOTE_LABEL: Record<Job["remote"], string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

/** Skills shown per row before the +N overflow chip. */
const MAX_SKILL_CHIPS = 3;

/** Newest roles rendered on the public preview. The full board (hundreds of
 *  roles) lives behind the free account: rendering it all here would ship a
 *  five-figure-node DOM, and the preview's job is proof, not exhaustiveness. */
const PREVIEW_ROLE_COUNT = 30;

/** The SLA windows recruiters can commit to, in display order. */
const SLA_WINDOWS = [24, 48, 72] as const;

// Void-section accent: solid brand blue with a light-emission glow, the same
// treatment the landing headline uses — this page continues that scene.
const ACCENT = "#4DB5FF";
const ACCENT_GLOW =
  "0 0 28px rgba(1,145,252,0.55), 0 0 10px rgba(1,145,252,0.45)";

/**
 * /jobs — the public, read-only job board preview.
 *
 * The conversion contract of the landing page: "Browse jobs" CTAs land HERE,
 * on real roles with their committed reply windows, not on a signup form.
 * Only the Apply action is gated (deep-linked so the user returns to the
 * board after creating an account). Signed-in users have richer boards of
 * their own, so they are routed to them instead.
 *
 * Design: the dark hero extends the landing's void scene (black + one blue
 * key light) and shows the mechanic with REAL numbers (live role count,
 * committed-window tally — PRODUCT.md: the mechanic is the proof). The board
 * itself is a dense row list, the honest shape of a job board, with a single
 * quiet Apply affordance per row instead of a wall of buttons.
 */
export default async function PublicJobsPage(): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions).catch(() => null);
  if (session?.user?.role === "student") redirect("/student/jobs");
  if (session?.user?.role === "recruiter") redirect("/recruiter/command");
  if (session?.user?.role === "admin") redirect("/admin/today");
  if (session?.user?.role === "instructor") redirect("/instructor/today");

  // Both reads are Redis-cached (60s) — this page adds no hot-path DB load.
  // Degrade to an honest empty board rather than a 500 on a public page.
  const [jobs, companies] = await Promise.all([
    listJobs().catch((): Job[] => []),
    listCompanies().catch((): CompanyProfile[] => []),
  ]);
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const openJobs = jobs
    .filter((j) => j.active)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const previewJobs = openJobs.slice(0, PREVIEW_ROLE_COUNT);

  // Real tally of committed reply windows across the whole live board — the
  // hero's proof strip. Never invented; zero-count windows simply drop out.
  const windowCounts = new Map<number, number>();
  for (const job of openJobs) {
    windowCounts.set(job.slaHours, (windowCounts.get(job.slaHours) ?? 0) + 1);
  }

  return (
    <main className="relative min-h-[100dvh] bg-neutral-25">
      {/* ── Void hero — the landing's dark beat continues here ── */}
      <div
        className="relative text-white"
        style={{
          background:
            "radial-gradient(ellipse 110% 80% at 50% -20%, rgba(1,145,252,0.20) 0%, rgba(1,145,252,0.05) 38%, transparent 60%), #000000",
        }}
      >
        <GlassNavbar />

        <section className="mx-auto max-w-content px-4 pt-12 pb-14 md:pt-20 md:pb-20">
          <h1
            className="font-display font-black tracking-tight text-5xl md:text-6xl leading-[1.02] text-balance"
            style={{ letterSpacing: "-0.03em" }}
          >
            Every role here{" "}
            <span style={{ color: ACCENT, textShadow: ACCENT_GLOW }}>
              answers.
            </span>
          </h1>
          <p className="mt-5 max-w-2xl text-body-lg leading-relaxed text-white/70 text-pretty">
            Each posting carries a public reply window the recruiter committed
            to before it went live. Browsing is free: no account until you
            apply.
          </p>

          {/* The mechanic, spelled out — the platform's actual proof. */}
          <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-body-sm text-white/60">
            <MechanicStep icon={<Send size={13} />} label="Apply free" />
            <StepArrow />
            <MechanicStep icon={<Timer size={13} />} label="The clock starts" />
            <StepArrow />
            <MechanicStep
              icon={<RotateCcw size={13} />}
              label="Reply on time, or your credit returns"
            />
          </div>

          {/* Live-board tally: real counts, straight from the data. */}
          {openJobs.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-white/10 pt-7">
              <div>
                <p className="font-display text-3xl font-extrabold tnum leading-none">
                  {openJobs.length}
                </p>
                <p className="mt-1.5 text-body-xs text-white/50">
                  open roles right now
                </p>
              </div>
              <div
                aria-hidden
                className="hidden h-10 w-px bg-white/10 sm:block"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {SLA_WINDOWS.filter((w) => windowCounts.has(w)).map((w) => (
                    <span
                      key={w}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-body-xs font-semibold text-white/85 ring-1 ring-white/15"
                    >
                      <Timer size={11} style={{ color: ACCENT }} />
                      {w}h
                      <span className="font-normal text-white/45 tnum">
                        × {windowCounts.get(w)}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="mt-1.5 text-body-xs text-white/50">
                  reply windows recruiters committed to
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── Board ── */}
      <section className="mx-auto max-w-content px-4 pb-16 md:pb-20">
        {openJobs.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center">
            <p className="font-display text-display-md font-bold text-neutral-950">
              The next batch of roles is being posted.
            </p>
            <p className="mx-auto mt-3 max-w-md text-body-md text-neutral-700">
              Create a free account and we&apos;ll notify you the moment new
              roles with reply guarantees go live.
            </p>
            <Link
              href="/signup?next=/student/jobs"
              className="btn btn-primary btn-lg mt-8 inline-flex"
            >
              Create free account
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 pt-10 pb-4 md:pt-14">
              <h2 className="font-display text-xl font-bold tracking-tight text-neutral-950">
                Newest roles
              </h2>
              <p className="text-body-xs text-neutral-500">
                sorted by posting date · updated continuously
              </p>
            </div>

            <ul className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(10,10,10,0.03)]">
              {previewJobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  company={companyById.get(job.companyId)}
                />
              ))}
            </ul>

            {openJobs.length > previewJobs.length && (
              <p className="mt-6 text-center text-body-sm text-neutral-700">
                Showing the{" "}
                <span className="font-semibold text-neutral-900 tnum">
                  {previewJobs.length}
                </span>{" "}
                newest roles — all{" "}
                <span className="font-semibold text-neutral-900 tnum">
                  {openJobs.length}
                </span>{" "}
                open with search and filters after a free signup.
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Conversion band ── */}
      {openJobs.length > 0 && (
        <section className="mx-auto max-w-content px-4 pb-20 md:pb-28">
          <div className="relative overflow-hidden rounded-2xl bg-neutral-950 px-6 py-12 text-center md:px-12 md:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 90% at 50% 0%, rgba(1,145,252,0.28), transparent 70%)",
              }}
            />
            <div className="relative">
              <h2 className="font-display text-display-md font-extrabold tracking-tight text-white text-balance">
                Two free applications. Reply deadlines on all of them.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-body-md leading-relaxed text-white/70">
                No card required. If a recruiter lets the clock run out, the
                application credit returns to you.
              </p>
              <Link
                href="/signup?next=/student/jobs"
                className="btn btn-primary btn-lg mt-8 inline-flex"
              >
                Start applying free
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}

/* ── Hero pieces ─────────────────────────────────────────────────────────── */

function MechanicStep({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1.5 text-white/75">
      <span style={{ color: ACCENT }}>{icon}</span>
      {label}
    </span>
  );
}

function StepArrow(): React.ReactElement {
  return (
    <ArrowRight aria-hidden size={12} className="shrink-0 text-white/30" />
  );
}

/* ── Board row ───────────────────────────────────────────────────────────── */

/**
 * One role, one row — the honest shape of a job board. The whole row is the
 * gated Apply link; the affordance stays quiet ("Apply free →") until hover
 * so thirty rows don't become thirty shouting buttons.
 */
function JobRow({
  job,
  company,
}: {
  job: Job;
  company: CompanyProfile | undefined;
}): React.ReactElement {
  const companyName = company?.name ?? "Confidential company";
  const extraSkills = job.skills.length - MAX_SKILL_CHIPS;
  const hasExperience = job.experienceMax > 0;
  // Seeded locations often embed the arrangement ("Bengaluru, India (Hybrid)");
  // strip it so the meta line doesn't read "… (Hybrid) · Hybrid".
  const location = job.location.replace(
    /\s*\((remote|hybrid|on-?site)\)\s*$/i,
    "",
  );

  return (
    <li className="border-b border-neutral-100 last:border-b-0">
      <Link
        href="/signup?next=/student/jobs"
        className="group grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-brand-50/50 sm:px-6 md:grid-cols-[auto_minmax(0,1fr)_auto]"
      >
        <CompanyLogo
          name={companyName}
          logoUrl={company?.logoUrl}
          size={44}
          rounded="rounded-xl"
        />

        {/* Role + meta */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="truncate font-display text-[16px] font-bold leading-snug text-neutral-950">
              {job.title}
            </p>
            <span className="inline-flex items-center gap-1 text-body-sm text-neutral-600">
              {companyName}
              {company?.verified && (
                <BadgeCheck
                  size={13}
                  className="shrink-0 text-brand-700"
                  aria-label="Verified company"
                />
              )}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-neutral-600">
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} className="shrink-0 text-neutral-400" />
              {location}
            </span>
            <MetaDot />
            <span>{REMOTE_LABEL[job.remote]}</span>
            {hasExperience && (
              <>
                <MetaDot />
                <span className="tnum">
                  {job.experienceMin}–{job.experienceMax} yrs
                </span>
              </>
            )}
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <MetaDot />
              {job.skills.slice(0, MAX_SKILL_CHIPS).map((skill) => (
                <span
                  key={skill}
                  className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11.5px] font-medium text-neutral-600"
                >
                  {skill}
                </span>
              ))}
              {extraSkills > 0 && (
                <span className="text-[11.5px] text-neutral-400 tnum">
                  +{extraSkills}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Salary + window + the quiet affordance. Second row on phones. */}
        <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:justify-end md:gap-5">
          <span className="font-display text-[15px] font-bold text-neutral-950 tnum">
            {job.salaryMin}–{job.salaryMax} LPA
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-semibold text-brand-800 ring-1 ring-brand-500/15">
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Replies in {job.slaHours}h
          </span>
          <span className="hidden shrink-0 items-center gap-1 text-body-sm font-semibold text-brand-700 transition-transform duration-200 group-hover:translate-x-0.5 sm:inline-flex">
            Apply free
            <ArrowRight size={14} />
          </span>
          {/* Phones drop the label; a chevron keeps the row's tap affordance. */}
          <ArrowRight
            aria-hidden
            size={15}
            className="shrink-0 text-brand-700 sm:hidden"
          />
        </div>
      </Link>
    </li>
  );
}

function MetaDot(): React.ReactElement {
  return (
    <span
      aria-hidden
      className="h-[3px] w-[3px] shrink-0 rounded-full bg-neutral-300"
    />
  );
}
