import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassNavbar,
} from "@/components/glass";
import {
  getApplicationById,
  getCompanyById,
  getJobById,
} from "@/server/store";
import { ApplicationDetail } from "@/components/student/ApplicationDetail";

export default async function ApplicationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session)
    redirect(`/login?next=/student/applications/${params.id}`);
  if (session.user.role !== "student") redirect("/");

  const app = await getApplicationById(params.id);
  if (!app) notFound();
  if (app.studentId !== session.user.id) redirect("/student/applications");

  const job = await getJobById(app.jobId);
  if (!job) notFound();
  const company = job.companyId ? await getCompanyById(job.companyId) : null;

  // PRD: recruiter identity revealed once student passes Stage 1
  const PIPELINE_STAGES = ["new_matches", "under_review", "interview", "offer", "hired"];
  const recruiterRevealed =
    PIPELINE_STAGES.indexOf(app.stage) >= 1;

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-4xl px-4 pt-6 pb-12">
        <ApplicationDetail
          application={app}
          job={job}
          company={company ?? null}
          recruiterRevealed={recruiterRevealed}
        />
      </div>
    </main>
  );
}
