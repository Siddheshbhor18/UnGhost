import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Building2, Users as UsersIcon } from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import {
  getCompanyById,
  getUserById,
  listCompanyRecruiters,
} from "@/server/store";
import { TeamClient } from "@/components/recruiter/TeamClient";

export default async function CompanyTeamPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=recruiter");
  if (session.user.role !== "recruiter") redirect("/");

  const user = await getUserById(session.user.id);
  if (!user?.companyId) {
    return (
      <main className="relative min-h-screen">
        <BlobField />
        <GlassNavbar />
        <div className="mx-auto max-w-3xl px-4 pt-10">
          <GlassCard className="text-center !py-10">
            <Building2 size={28} className="mx-auto text-brand-muted mb-3" />
            <p className="font-display font-bold text-brand-ink">
              Not attached to a company yet
            </p>
            <p className="text-sm text-brand-muted mt-2">
              Create or join one in onboarding.
            </p>
          </GlassCard>
        </div>
      </main>
    );
  }
  const [company, team] = await Promise.all([
    getCompanyById(user.companyId),
    listCompanyRecruiters(user.companyId),
  ]);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <div className="mb-6">
          <GlassBadge tone="brand">
            <UsersIcon size={11} /> Team
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            {company?.name ?? "Your company"}
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            {team.length} recruiter{team.length === 1 ? "" : "s"} ·{" "}
            {team.filter((t) => t.isCompanyAdmin).length} admin
            {team.filter((t) => t.isCompanyAdmin).length === 1 ? "" : "s"}
          </p>
        </div>
        <TeamClient
          initial={team}
          selfId={session.user.id}
          selfIsAdmin={user.isCompanyAdmin ?? false}
          companyId={user.companyId}
          companyName={company?.name ?? "your company"}
        />
      </div>
    </main>
  );
}
