import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowRight, BadgeCheck, MapPin, Timer } from "lucide-react";
import { authOptions } from "@/server/auth";
import { listJobs, listCompanies } from "@/server/store";
import type { CompanyProfile, Job } from "@/shared/types";
import { GlassNavbar } from "@/components/glass";
import { CompanyLogo } from "@/components/shared/CompanyLogo";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Badge } from "@/components/ui";

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

/** Skills shown per card before the +N overflow chip. */
const MAX_SKILL_CHIPS = 4;

/** Newest roles rendered on the public preview. The full board (hundreds of
 *  roles) lives behind the free account: rendering it all here would ship a
 *  five-figure-node DOM, and the preview's job is proof, not exhaustiveness. */
const PREVIEW_ROLE_COUNT = 30;

/**
 * /jobs — the public, read-only job board preview.
 *
 * The conversion contract of the landing page: "Browse jobs" CTAs land HERE,
 * on real roles with their committed reply windows, not on a signup form.
 * Only the Apply action is gated (deep-linked so the user returns to the
 * board after creating an account). Signed-in users have richer boards of
 * their own, so they are routed to them instead.
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

  return (
    <main className="relative min-h-[100dvh]">
      <GlassNavbar />

      {/* ── Header ── */}
      <section className="mx-auto max-w-content px-4 pt-14 md:pt-20 pb-8">
        <h1 className="font-display font-extrabold tracking-tight text-4xl md:text-5xl text-neutral-950 text-balance">
          Every role here answers.
        </h1>
        <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-neutral-900 text-pretty">
          Each posting carries a public reply window the recruiter committed
          to before it went live. Apply and the clock starts; if they miss it,
          your application credit comes back automatically.
        </p>
        <p className="mt-3 text-body-sm text-neutral-700">
          {openJobs.length > 0 ? (
            <>
              <span className="font-semibold text-neutral-900 tnum">
                {openJobs.length}
              </span>{" "}
              open {openJobs.length === 1 ? "role" : "roles"} right now ·
              browsing is free, no account needed
            </>
          ) : (
            "Browsing is free, no account needed"
          )}
        </p>
      </section>

      {/* ── Board ── */}
      <section className="mx-auto max-w-content px-4 pb-16 md:pb-24">
        {openJobs.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center">
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
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {previewJobs.map((job) => (
                <PublicJobCard
                  key={job.id}
                  job={job}
                  company={companyById.get(job.companyId)}
                />
              ))}
            </ul>
            {openJobs.length > previewJobs.length && (
              <p className="mt-8 text-center text-body-sm text-neutral-700">
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
          <div className="rounded-2xl bg-neutral-950 px-6 py-12 text-center md:px-12">
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
        </section>
      )}

      <SiteFooter />
    </main>
  );
}

function PublicJobCard({
  job,
  company,
}: {
  job: Job;
  company: CompanyProfile | undefined;
}): React.ReactElement {
  const companyName = company?.name ?? "Confidential company";
  const extraSkills = job.skills.length - MAX_SKILL_CHIPS;
  const hasExperience = job.experienceMax > 0;

  return (
    <li className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-5 transition-colors hover:border-brand-300">
      <div className="flex items-start gap-3">
        <CompanyLogo name={companyName} logoUrl={company?.logoUrl} size={44} rounded="rounded-xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-body-sm font-semibold text-neutral-700">
              {companyName}
            </p>
            {company?.verified && (
              <BadgeCheck
                size={14}
                className="shrink-0 text-brand-700"
                aria-label="Verified company"
              />
            )}
          </div>
          <h2 className="mt-0.5 truncate font-display text-lg font-bold leading-snug text-neutral-950">
            {job.title}
          </h2>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-neutral-700">
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} className="shrink-0 text-neutral-500" />
          {job.location}
        </span>
        <Badge tone="neutral">{REMOTE_LABEL[job.remote]}</Badge>
        {hasExperience && (
          <span className="tnum">
            {job.experienceMin}–{job.experienceMax} yrs
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.skills.slice(0, MAX_SKILL_CHIPS).map((skill) => (
          <span
            key={skill}
            className="rounded-md bg-neutral-100 px-2 py-0.5 text-body-xs font-medium text-neutral-700"
          >
            {skill}
          </span>
        ))}
        {extraSkills > 0 && (
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-body-xs font-medium text-neutral-700 tnum">
            +{extraSkills}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-neutral-100 pt-4">
        <span className="font-display text-base font-bold text-brand-800 tnum">
          {job.salaryMin}–{job.salaryMax} LPA
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-body-xs font-semibold text-brand-800 ring-1 ring-brand-500/15">
          <Timer size={11} className="shrink-0" />
          Replies in {job.slaHours}h
        </span>
      </div>

      {/* The only gated action on the page. Deep link returns the user to
          their board right after account creation. */}
      <Link
        href="/signup?next=/student/jobs"
        className="btn btn-primary btn-md mt-4 w-full"
      >
        Apply free
        <ArrowRight size={14} />
      </Link>
    </li>
  );
}
