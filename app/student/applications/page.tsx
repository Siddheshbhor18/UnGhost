import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassNavbar,
} from "@/components/glass";
import {
  listApplicationsByStudent,
  listCompanies,
  listJobs,
  maybeRunSlaSweep,
} from "@/server/store";
import { ApplicationsList } from "@/components/student/ApplicationsList";

export default async function ApplicationsListPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/student/applications");
  if (session.user.role !== "student") redirect("/");

  await maybeRunSlaSweep();

  const [apps, jobs, companies] = await Promise.all([
    listApplicationsByStudent(session.user.id),
    listJobs(),
    listCompanies(),
  ]);
  const jobIdx = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const coIdx = Object.fromEntries(companies.map((c) => [c.id, c]));

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-5xl px-4 pt-6 pb-12">
        <div className="mb-6">
          <GlassBadge tone="brand">Your pipeline</GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Active applications
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Every application. Live SLA. AI grade. Withdraw or ping recruiter
            from here.
          </p>
        </div>
        <ApplicationsList apps={apps} jobs={jobIdx} companies={coIdx} />
      </div>
    </main>
  );
}
