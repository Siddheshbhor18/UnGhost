import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { FileText } from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassNavbar,
} from "@/components/glass";
import {
  getUserById,
  listJobTemplatesForRecruiter,
} from "@/server/store";
import { TemplatesClient } from "@/components/recruiter/TemplatesClient";

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=recruiter");
  if (session.user.role !== "recruiter") redirect("/");

  const user = await getUserById(session.user.id);
  const list = await listJobTemplatesForRecruiter(
    session.user.id,
    user?.companyId,
  );

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <div className="mb-6">
          <GlassBadge tone="brand">
            <FileText size={11} /> Job templates
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Reuse your wins
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Saved JD shapes · skill lists · SLAs. Company Admins can share
            templates across the team. {list.length} available.
          </p>
        </div>
        <TemplatesClient initial={list} recruiterId={session.user.id} />
      </div>
    </main>
  );
}
