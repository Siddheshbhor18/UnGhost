import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/shared/Navbar";
import { PixelButton } from "@/components/arcade/PixelButton";
import { Badge } from "@/components/arcade/Badge";
import { KanbanBoard } from "@/components/recruiter/KanbanBoard";
import {
  getCompanyById,
  getUserById,
  listApplicationsByRecruiter,
  listJobsByRecruiter,
  listUsers,
} from "@/lib/data/store";
import { Plus, Building2 } from "lucide-react";

export default async function CommandCenter() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/recruiter/login");
  if (session.user.role !== "recruiter") redirect(session.user.role === "admin" ? "/admin/metrics" : "/dashboard");

  const apps = listApplicationsByRecruiter(session.user.id);
  const jobs = listJobsByRecruiter(session.user.id);
  const user = getUserById(session.user.id);
  const co = user?.companyId ? getCompanyById(user.companyId) : undefined;

  const jobIndex = Object.fromEntries(jobs.map((j) => [j.id, j]));
  const students = Object.fromEntries(listUsers("student").map((u) => [u.id, u]));

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
          <div>
            <Badge tone="blue"><Building2 size={10} /> COMMAND CENTER</Badge>
            <h1 className="font-pixel text-2xl text-neon-blue neon-text mt-2">{co?.name ?? "Your Pipeline"}</h1>
            <p className="font-mono text-xs text-ink-muted">
              {jobs.length} mission{jobs.length === 1 ? "" : "s"} · {apps.length} applicant{apps.length === 1 ? "" : "s"}
            </p>
          </div>
          <Link href="/recruiter/deploy">
            <PixelButton variant="pink" size="lg">
              <Plus size={14} /> Deploy Mission
            </PixelButton>
          </Link>
        </div>

        {/* Mission strip */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {jobs.map((j) => (
            <div key={j.id} className="pixel-card px-3 py-2 shrink-0 min-w-[200px]">
              <p className="font-pixel text-[10px] text-neon-pink truncate">{j.title}</p>
              <p className="font-mono text-[10px] text-ink-muted">
                {j.slaHours}H SLA · ₹{j.salaryMin}–{j.salaryMax}L
              </p>
            </div>
          ))}
          {jobs.length === 0 && (
            <p className="font-mono text-sm text-ink-muted">No missions deployed yet. Click &quot;Deploy Mission&quot; →</p>
          )}
        </div>

        <KanbanBoard applications={apps} jobs={jobIndex} students={students} />
      </div>
    </main>
  );
}
