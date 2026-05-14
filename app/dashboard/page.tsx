import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/shared/Navbar";
import { MissionTimeline } from "@/components/candidate/MissionTimeline";
import { MatchmakerFeed } from "@/components/candidate/MatchmakerFeed";
import { AICoachPanel } from "@/components/candidate/AICoachPanel";
import { Badge } from "@/components/arcade/Badge";
import {
  listApplicationsByStudent,
  listCompanies,
  listJobs,
  getUserById,
  listLiveCampaigns,
} from "@/lib/data/store";
import { computeMatchPct } from "@/lib/utils/matching";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/dashboard");
  if (session.user.role !== "student") redirect(session.user.role === "recruiter" ? "/recruiter/command" : "/admin/metrics");

  const user = getUserById(session.user.id);
  const apps = listApplicationsByStudent(session.user.id);
  const jobs = listJobs();
  const companies = listCompanies();
  const banner = listLiveCampaigns("dashboard_top")[0];

  const jobIndex: Record<string, (typeof jobs)[number]> = {};
  jobs.forEach((j) => (jobIndex[j.id] = j));
  const coIndex: Record<string, (typeof companies)[number]> = {};
  companies.forEach((c) => (coIndex[c.id] = c));

  const matchByJob: Record<string, number> = {};
  for (const j of jobs) {
    matchByJob[j.id] = computeMatchPct(user?.profile?.skills ?? [], j.skills);
  }
  const ranked = [...jobs].sort((a, b) => (matchByJob[b.id] ?? 0) - (matchByJob[a.id] ?? 0));

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <Badge tone="pink">▸ THE TERMINAL</Badge>
            <h1 className="font-pixel text-xl text-neon-pink neon-text mt-2">
              Hey {user?.profile?.alias ?? user?.name}.
            </h1>
            <p className="font-mono text-xs text-ink-muted">
              {apps.length} active mission{apps.length === 1 ? "" : "s"} ·{" "}
              {user?.profile?.verifiedSkills.length ?? 0} verified skill{user?.profile?.verifiedSkills.length === 1 ? "" : "s"}
            </p>
          </div>
          {banner && (
            <div className="pixel-card border-neon-pink p-3 max-w-md">
              <p className="font-pixel text-[10px] text-neon-pink">▸ {banner.headline}</p>
              <p className="font-mono text-[10px] text-ink-muted">{banner.subtext}</p>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-12 gap-4">
          {/* LEFT — Active Missions */}
          <aside className="lg:col-span-3">
            <h2 className="font-pixel text-xs text-neon-blue mb-3">▸ ACTIVE MISSIONS</h2>
            <MissionTimeline applications={apps} jobs={jobIndex} />
          </aside>

          {/* CENTER — Matchmaker Feed */}
          <section className="lg:col-span-6">
            <h2 className="font-pixel text-xs text-neon-green mb-3">▸ MATCHMAKER FEED · RANKED</h2>
            <MatchmakerFeed jobs={ranked} companies={coIndex} matchByJob={matchByJob} />
          </section>

          {/* RIGHT — AI Coach */}
          <aside className="lg:col-span-3">
            <h2 className="font-pixel text-xs text-neon-green mb-3">▸ AI COACH</h2>
            <AICoachPanel />
          </aside>
        </div>
      </div>
    </main>
  );
}
