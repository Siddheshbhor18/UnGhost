import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  Clock,
  MapPin,
} from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import {
  getUserById,
  listCompanies,
  listJobs,
  listSavedJobs,
} from "@/server/store";
import { computeMatchPct } from "@/server/lib/matching";
import { canonicalizeSkills } from "@/server/lib/skill-canon";

export default async function SavedJobsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/student/saved");
  if (session.user.role !== "student") redirect("/");

  const [saved, jobs, companies, user] = await Promise.all([
    listSavedJobs(session.user.id),
    listJobs(),
    listCompanies(),
    getUserById(session.user.id),
  ]);
  const jobIdx = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const coIdx = Object.fromEntries(companies.map((c) => [c.id, c]));
  const studentSkills = user?.profile?.skills ?? [];

  // Canonicalize once across the saved jobs, then match on canonical forms.
  const savedJobsList = saved
    .map((s) => jobIdx[s.jobId])
    .filter((j): j is NonNullable<typeof j> => Boolean(j));
  const skillCanon = await canonicalizeSkills([
    ...studentSkills,
    ...savedJobsList.flatMap((j) => j.skills),
  ]);
  const toCanon = (arr: string[]) => arr.map((s) => skillCanon.get(s) ?? s);
  const studentCanon = toCanon(studentSkills);

  // Hydrate saved jobs with match% + filter out any saved-but-since-deleted jobs
  const cards = saved
    .map((s) => {
      const job = jobIdx[s.jobId];
      if (!job) return null;
      return {
        savedAt: s.savedAt,
        job,
        company: coIdx[job.companyId],
        matchPct: computeMatchPct(studentCanon, toCanon(job.skills)),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-12">
        <div className="mb-6">
          <GlassBadge tone="brand">
            <Bookmark size={11} /> Saved jobs
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Your shortlist
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {cards.length} pinned · click any to open the Mission Brief +
            apply. Unsave by clicking the bookmark again.
          </p>
        </div>

        {cards.length === 0 ? (
          <GlassCard className="text-center !py-12">
            <Bookmark size={28} className="mx-auto text-brand-muted mb-3" />
            <p className="font-display font-bold text-brand-ink">
              No saved jobs yet
            </p>
            <p className="text-sm text-brand-muted mt-2">
              Click the bookmark icon on any job card to pin it here for later.
            </p>
            <Link
              href="/dashboard"
              className="btn-brand mt-5 inline-flex"
            >
              Browse missions <ArrowRight size={14} />
            </Link>
          </GlassCard>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {cards.map((c) => (
              <Link key={c.job.id} href={`/missions/${c.job.id}`}>
                <GlassCard interactive>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <GlassBadge tone="neutral" className="mb-2">
                        <Briefcase size={10} /> {c.company?.name ?? "—"}
                      </GlassBadge>
                      <h4 className="font-display font-bold text-brand-ink truncate">
                        {c.job.title}
                      </h4>
                      <p className="text-xs text-brand-muted mt-1 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={11} /> {c.job.location} ·{" "}
                          {c.job.remote}
                        </span>
                        <span>
                          ₹{c.job.salaryMin}–{c.job.salaryMax} LPA
                        </span>
                      </p>
                      <p className="text-[10px] text-brand-muted mt-2">
                        Saved{" "}
                        {new Date(c.savedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div
                        className={
                          "font-display font-extrabold text-2xl " +
                          (c.matchPct >= 80
                            ? "text-emerald-600"
                            : c.matchPct >= 60
                            ? "text-brand-primary"
                            : "text-brand-muted")
                        }
                      >
                        {c.matchPct}
                        <span className="text-sm">%</span>
                      </div>
                      <GlassBadge
                        tone={
                          c.job.slaHours <= 24
                            ? "success"
                            : c.job.slaHours <= 48
                            ? "warn"
                            : "brand"
                        }
                        className="mt-2"
                      >
                        <Clock size={10} /> {c.job.slaHours}h
                      </GlassBadge>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
