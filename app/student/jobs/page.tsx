import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Briefcase } from "lucide-react";
import { authOptions } from "@/server/auth";
import { BlobField, GlassBadge, GlassNavbar } from "@/components/glass";
import {
  getUserById,
  listCompanies,
  listJobs,
  listNotInterestedJobIds,
  listSavedJobs,
} from "@/server/store";
import { computeMatchPct } from "@/server/lib/matching";
import { JobsExplorer } from "@/components/student/JobsExplorer";

export default async function StudentJobsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/student/jobs");
  if (session.user.role !== "student") redirect("/");

  const [jobs, companies, user, savedJobs, notInterestedIds] =
    await Promise.all([
      listJobs(),
      listCompanies(),
      getUserById(session.user.id),
      listSavedJobs(session.user.id),
      listNotInterestedJobIds(session.user.id),
    ]);

  const dismissed = new Set(notInterestedIds);
  const skills = user?.profile?.skills ?? [];
  const hasSkills = skills.length > 0;

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c]));
  const jobsWithMatch = jobs
    .filter((j) => !dismissed.has(j.id))
    .map((j) => ({ ...j, matchPct: computeMatchPct(skills, j.skills) }));

  const savedIds = savedJobs.map((s) => s.jobId);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-12">
        <div className="mb-6">
          <GlassBadge tone="brand">
            <Briefcase size={11} /> All open roles
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Browse every mission
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {jobsWithMatch.length} live roles across {companies.length}{" "}
            companies. Filter, shortlist, and apply — every role is SLA-bound.
          </p>
        </div>

        <JobsExplorer
          jobs={jobsWithMatch}
          companies={companyMap}
          savedIds={savedIds}
          hasSkills={hasSkills}
        />
      </div>
    </main>
  );
}
