import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/shared/Navbar";
import { Badge } from "@/components/arcade/Badge";
import { PixelButton } from "@/components/arcade/PixelButton";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { ScoreCounter } from "@/components/arcade/ScoreCounter";
import { SkillDeltaTable } from "@/components/candidate/SkillDeltaTable";
import {
  getCompanyById,
  getJobById,
  getBootcampForSkill,
  getUserById,
} from "@/lib/data/store";
import { computeMatchPct, skillDelta } from "@/lib/utils/matching";
import { Banknote, Clock, MapPin, ShieldCheck, Target } from "lucide-react";

export default async function MissionBrief({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?next=/missions/${params.id}`);

  const job = getJobById(params.id);
  if (!job) notFound();

  const co = getCompanyById(job.companyId);
  const user = getUserById(session.user.id);
  const studentSkills = user?.profile?.skills ?? [];
  const matchPct = computeMatchPct(studentSkills, job.skills);
  const delta = skillDelta(studentSkills, job.skills);
  const rows = delta.map((d) => ({
    ...d,
    bootcampId: d.has ? undefined : getBootcampForSkill(d.skill)?.id,
  }));

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid pb-32">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Link href="/dashboard" className="font-mono text-xs text-neon-blue">← Back to Terminal</Link>

        <div className="mt-4 grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <ArcadeCard glow="pink">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge tone="blue" className="mb-2">{co?.name}</Badge>
                  <h1 className="font-pixel text-2xl text-neon-pink neon-text">{job.title}</h1>
                  <p className="font-mono text-xs text-ink-muted mt-2 flex flex-wrap gap-3">
                    <span className="inline-flex gap-1 items-center"><MapPin size={11}/> {job.location} · {job.remote}</span>
                    <span className="inline-flex gap-1 items-center"><Banknote size={11}/> ₹{job.salaryMin}–{job.salaryMax} LPA</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-pixel text-[9px] text-ink-muted mb-1">YOUR MATCH</p>
                  <ScoreCounter value={matchPct} suffix="%" color={matchPct >= 85 ? "green" : "yellow"} className="text-3xl" />
                </div>
              </div>
            </ArcadeCard>

            <ArcadeCard>
              <p className="font-pixel text-[10px] text-neon-blue mb-3">▸ MISSION BRIEF</p>
              <p className="font-mono text-sm text-ink-primary leading-relaxed whitespace-pre-line">
                {job.description}
              </p>
            </ArcadeCard>

            <SkillDeltaTable rows={rows} />

            <ArcadeCard glow="yellow">
              <p className="font-pixel text-[10px] text-neon-yellow mb-2 flex items-center gap-2">
                <Target size={12} /> THE GAUNTLET · PREVIEW
              </p>
              <blockquote className="font-mono text-sm text-ink-primary border-l-4 border-neon-yellow pl-4 italic">
                {job.gauntletPrompt}
              </blockquote>
              <p className="font-mono text-[10px] text-ink-dim mt-3">
                You&apos;ll respond in long-form. AI grades depth, evidence, and trade-offs. The recruiter sees your answer + the AI notes side-by-side.
              </p>
            </ArcadeCard>
          </div>

          <aside className="space-y-4">
            <ArcadeCard glow="green">
              <p className="font-pixel text-[10px] text-neon-green mb-3 flex items-center gap-2">
                <ShieldCheck size={12} /> GUARANTEED INTEL
              </p>
              <p className="font-pixel text-2xl text-neon-green neon-text mb-1">
                {job.slaHours}H
              </p>
              <p className="font-mono text-xs text-ink-muted">
                {co?.name} commits to respond within <b className="text-neon-green">{job.slaHours} hours</b>. Miss it → recruiter ghost-rated.
              </p>
              <p className="font-mono text-[10px] text-ink-dim mt-3 flex items-center gap-1">
                <Clock size={10} /> Posted {new Date(job.createdAt).toLocaleDateString("en-IN")}
              </p>
            </ArcadeCard>
            <ArcadeCard>
              <p className="font-pixel text-[10px] text-neon-blue mb-2">▸ ABOUT {co?.name?.toUpperCase()}</p>
              <p className="font-mono text-xs text-ink-muted">{co?.description}</p>
            </ArcadeCard>
          </aside>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 border-t-2 border-bg-ink bg-bg-panel/90 backdrop-blur z-30">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-pixel text-[10px] text-neon-pink">▸ READY?</p>
            <p className="font-mono text-xs text-ink-muted">
              The Gauntlet is one prompt, ~10 min. No CV upload, no cover letter.
            </p>
          </div>
          <Link href={`/missions/${job.id}/assess`}>
            <PixelButton variant="pink" size="lg">
              <Target size={14} /> Take Assessment to Apply
            </PixelButton>
          </Link>
        </div>
      </div>
    </main>
  );
}
