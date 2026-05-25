import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { getUserById } from "@/server/store";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";
import { Rocket, AlertTriangle } from "lucide-react";
import DeployMissionForm from "./DeployMissionForm";

export default async function DeployMissionPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=recruiter");
  if (session.user.role !== "recruiter") redirect("/");

  const user = await getUserById(session.user.id);
  const companyId = user?.companyId;

  if (!companyId) {
    return (
      <main className="min-h-screen relative">
        <BlobField />
        <GlassNavbar />
        <div className="mx-auto max-w-2xl px-4 py-16">
          <GlassBadge tone="warn">
            <AlertTriangle size={12} /> Account Not Linked
          </GlassBadge>
          <h1 className="font-display text-3xl font-bold text-brand-ink mt-3 mb-2">
            No company on file
          </h1>
          <GlassCard className="mt-4">
            <p className="text-sm text-brand-muted leading-relaxed">
              Your recruiter account isn&apos;t linked to a company yet. You
              won&apos;t be able to deploy missions until ops assigns you to
              one.
            </p>
            <p className="text-sm text-brand-muted mt-3">
              Contact ops at{" "}
              <a
                href="mailto:ops@unghost.in"
                className="text-brand-primary font-semibold underline"
              >
                ops@unghost.in
              </a>{" "}
              to get assigned.
            </p>
          </GlassCard>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <GlassBadge tone="brand">
          <Rocket size={12} /> Deploy Mission · Zero-setup
        </GlassBadge>
        <h1 className="font-display text-4xl font-bold text-brand-ink mt-3 mb-1">
          Mission Deployment
        </h1>
        <p className="text-sm text-brand-muted mb-8">
          Paste a JD, hit Parse with AI, edit anything, then deploy. We handle the rest —
          gauntlet generation, candidate scoring, anti-ghost SLA.
        </p>

        <DeployMissionForm companyId={companyId} />
      </div>
    </main>
  );
}
