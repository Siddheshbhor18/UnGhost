import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassNavbar,
} from "@/components/glass";
import { getInMailCredits } from "@/server/store";
import { CandidateDatabase } from "@/components/recruiter/CandidateDatabase";

export default async function CandidatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=recruiter");
  if (session.user.role !== "recruiter") {
    redirect(session.user.role === "admin" ? "/admin/today" : "/dashboard");
  }
  const credits = await getInMailCredits(session.user.id);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-12">
        <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <GlassBadge tone="brand">Candidate database</GlassBadge>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
              Find your next hire
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              Natural-language search across every student. Anonymised by
              default · InMail unlock to reach out.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
              InMail credits
            </p>
            <p className="font-display font-extrabold text-2xl text-brand-primary">
              {credits}
            </p>
          </div>
        </div>

        <CandidateDatabase initialCredits={credits} />
      </div>
    </main>
  );
}
