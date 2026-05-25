import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Briefcase, GraduationCap } from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  GlassNavbar,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/glass";
import { BackdropMesh } from "@/components/ui";
import {
  listApplicationsByStudent,
  listCompanies,
  listJobs,
  listBootcamps,
  getUserById,
  getUsersByIds,
  listSponsorshipsByStudent,
  listInMailsByStudent,
  listNotInterestedJobIds,
  listSavedJobs,
  listUpcomingLiveForStudent,
  maybeRunSlaSweep,
} from "@/server/store";
import { computeMatchPct } from "@/server/lib/matching";
import { computeCompleteness } from "@/server/lib/profile-completeness";
import { ResumeDrop } from "@/components/student/ResumeDrop";
import { JobFeed } from "@/components/student/JobFeed";
import { BootcampGrid } from "@/components/student/BootcampGrid";
import { DailyBriefing } from "@/components/student/DailyBriefing";
import { StatBar } from "@/components/student/StatBar";
import { ActiveMissions } from "@/components/student/ActiveMissions";
import { CoachPanel } from "@/components/student/CoachPanel";
import { SponsorshipInbox } from "@/components/student/SponsorshipInbox";
import { InMailInbox } from "@/components/student/InMailInbox";

const MATCH_THRESHOLD = 60;
const FREE_APP_LIMIT = 5;

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/dashboard");
  if (session.user.role !== "student") {
    redirect(
      session.user.role === "recruiter" ? "/recruiter/command" : "/admin/metrics",
    );
  }

  // Cheap, throttled SLA sweep — fires breach/warning notifications inline so
  // the student lands on the dashboard with fresh state. Throttled to 60s to
  // avoid hammering. Real prod: swap for Inngest cron via /api/cron/sla-sweep.
  await maybeRunSlaSweep();

  const [
    user,
    apps,
    allJobs,
    companies,
    bcs,
    sponsorships,
    inmails,
    notInterestedIds,
    savedJobs,
    upcomingLive,
  ] = await Promise.all([
    getUserById(session.user.id),
    listApplicationsByStudent(session.user.id),
    listJobs(),
    listCompanies(),
    listBootcamps(),
    listSponsorshipsByStudent(session.user.id),
    listInMailsByStudent(session.user.id),
    listNotInterestedJobIds(session.user.id),
    listSavedJobs(session.user.id),
    // Real upcoming live sessions for this student (scheduled + live).
    // Was hardcoded `null` on DailyBriefing — students with imminent
    // sessions saw an empty slot despite the data being live.
    listUpcomingLiveForStudent(session.user.id),
  ]);
  // Filter out jobs the student dismissed from the feed
  const dismissed = new Set(notInterestedIds);
  const jobs = allJobs.filter((j) => !dismissed.has(j.id));
  const savedJobIds = savedJobs.map((s) => s.jobId);
  const bootcampIdx = Object.fromEntries(bcs.map((b) => [b.id, b]));

  const studentSkills = user?.profile?.skills ?? [];
  const enrolledBcs = user?.profile?.enrolledBootcamps ?? [];

  const jobsWithMatch = jobs.map((j) => ({
    ...j,
    matchPct: computeMatchPct(studentSkills, j.skills),
  }));
  const matched = jobsWithMatch
    .filter((j) => j.matchPct >= MATCH_THRESHOLD)
    .sort((a, b) => b.matchPct - a.matchPct);
  const stretch = jobsWithMatch
    .filter((j) => j.matchPct < MATCH_THRESHOLD)
    .sort((a, b) => b.matchPct - a.matchPct);

  const coIndex = Object.fromEntries(companies.map((c) => [c.id, c]));
  const jobIndex = Object.fromEntries(jobs.map((j) => [j.id, j]));
  // Single batched fetch — kills the previous N+1 (one Mongo round-trip per
  // instructor). With ~20 bootcamps this saves 15-30 round-trips.
  const instructorIds = Array.from(new Set(bcs.map((b) => b.instructorId)));
  const instructorMap = await getUsersByIds(instructorIds);
  const instructorIndex = Object.fromEntries(
    instructorIds.map((id) => [
      id,
      instructorMap.get(id) ? { name: instructorMap.get(id)!.name } : undefined,
    ]),
  );

  // KPI numbers
  const activeAppsCount = apps.filter(
    (a) => !["hired", "rejected"].includes(a.stage),
  ).length;
  // PRD: SLA breach refunds the slot; withdrawn apps don't refund. We count
  // every app the student *currently owns* a slot for — i.e. everything except
  // SLA-breached and "refunded" rejections.
  const applicationsUsed = apps.filter((a) => !a.slaRefundIssued).length;
  const avgMatch = jobsWithMatch.length
    ? Math.round(
        jobsWithMatch.reduce((s, j) => s + j.matchPct, 0) / jobsWithMatch.length,
      )
    : 0;
  const profileCompleteness = computeCompleteness(user).pct;

  // Daily Briefing inputs
  const newMatches = matched.filter((m) => m.matchPct >= 85).length;
  const pendingAssessments = apps.filter(
    (a) => a.stage === "new_matches" && !a.assessment,
  ).length;
  const firstName = user?.profile?.alias ?? user?.name?.split(" ")[0] ?? "there";

  return (
    <main className="relative min-h-screen">
      <BackdropMesh />
      <GlassNavbar />

      <div className="mx-auto max-w-content-wide px-4 pt-6 pb-16">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="font-display font-extrabold text-display-lg text-neutral-950 tracking-tighter">
              Today
            </h1>
            <p className="text-body-sm text-neutral-500 mt-1">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>

        {/* Daily Briefing */}
        <DailyBriefing
          studentName={firstName}
          newMatches={newMatches}
          pendingAssessments={pendingAssessments}
          upcomingBootcamp={
            // Surface the next live session if one is scheduled within
            // ~48h. The store helper already filters to scheduled+live
            // for this student's enrolled bootcamps. We only want one
            // imminent item — DailyBriefing's copy is shaped for that.
            upcomingLive[0]
              ? {
                  title: upcomingLive[0].title,
                  date: new Date(upcomingLive[0].startsAt).toLocaleString(
                    "en-IN",
                    {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    },
                  ),
                }
              : null
          }
          profileCompleteness={profileCompleteness}
        />

        {/* High-priority inboxes above KPIs */}
        <InMailInbox initial={inmails} />
        <SponsorshipInbox initial={sponsorships} bootcamps={bootcampIdx} />

        {/* 4-KPI Stat Bar */}
        <StatBar
          applicationsUsed={applicationsUsed}
          applicationsLimit={FREE_APP_LIMIT}
          activeApps={activeAppsCount}
          profileCompleteness={profileCompleteness}
          avgMatch={avgMatch}
        />

        {/* 3-Column Body */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left rail: Active Missions */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <ActiveMissions apps={apps} jobs={jobIndex} companies={coIndex} />
          </div>

          {/* Center: Jobs / Bootcamps tabs */}
          <div className="lg:col-span-6 order-1 lg:order-2">
            <Tabs defaultValue="jobs">
              <TabsList className="mb-5">
                <TabsTrigger value="jobs" icon={<Briefcase size={14} />}>
                  Matched Jobs
                </TabsTrigger>
                <TabsTrigger value="bootcamps" icon={<GraduationCap size={14} />}>
                  Bootcamps
                </TabsTrigger>
              </TabsList>

              <TabsContent value="jobs">
                <div className="mb-5">
                  <ResumeDrop initialSkills={studentSkills} />
                </div>
                <JobFeed
                  matched={matched}
                  stretch={stretch}
                  companies={coIndex}
                  savedIds={savedJobIds}
                />
              </TabsContent>

              <TabsContent value="bootcamps">
                <BootcampGrid
                  bootcamps={bcs}
                  instructors={instructorIndex}
                  enrolledIds={enrolledBcs}
                  sponsoredIds={sponsorships
                    .filter((s) => s.status === "offered")
                    .map((s) => s.bootcampId)}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right rail: AI Coach */}
          <div className="lg:col-span-3 order-3">
            <CoachPanel studentFirstName={firstName} />
          </div>
        </div>
      </div>
    </main>
  );
}

