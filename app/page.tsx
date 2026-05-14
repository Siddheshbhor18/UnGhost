import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { MagicWidget } from "@/components/candidate/MagicWidget";
import { PixelButton } from "@/components/arcade/PixelButton";
import { ArcadeCard } from "@/components/arcade/ArcadeCard";
import { Badge } from "@/components/arcade/Badge";
import { SectionHeader } from "@/components/arcade/SectionHeader";
import { ScoreCounter } from "@/components/arcade/ScoreCounter";
import { listJobs, listCompanies, getGlobalMetrics, listLiveCampaigns } from "@/lib/data/store";
import { Clock, Rocket, Shield, Sparkles, Target, Zap } from "lucide-react";

export default function LandingPage() {
  const jobs = listJobs().slice(0, 4);
  const companies = listCompanies();
  const metrics = getGlobalMetrics();
  const heroBanner = listLiveCampaigns("landing_hero")[0];

  return (
    <main className="min-h-screen bg-bg-base bg-arcade-grid">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-20 md:py-32">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <Badge tone="pink">▸ MISSION 01 · INDIA · LIVE</Badge>
              <h1 className="font-pixel text-3xl md:text-5xl leading-tight">
                <span className="block text-ink-primary">Stop being a</span>
                <span className="block text-neon-pink neon-text glitch" data-text="GHOST.">
                  GHOST.
                </span>
                <span className="block text-ink-primary mt-2">Start being a</span>
                <span className="block text-neon-green neon-text">HIRE.</span>
              </h1>
              <p className="text-ink-muted text-lg max-w-xl font-mono">
                AI-graded missions. Recruiters answer in 24–72 hours, guaranteed. Skills you don&apos;t have yet? Bridge them in a bootcamp before you apply.
              </p>

              <SearchBar />

              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/login">
                  <PixelButton variant="pink" size="lg">
                    <Rocket size={16} /> Search Missions
                  </PixelButton>
                </Link>
                <Link href="/recruiter/login">
                  <PixelButton variant="ghost" size="lg">
                    For Recruiters →
                  </PixelButton>
                </Link>
              </div>

              <div className="flex flex-wrap gap-6 pt-6 font-mono text-xs text-ink-muted">
                <span className="flex items-center gap-2"><Shield size={14} className="text-neon-green" /> SLA-bound</span>
                <span className="flex items-center gap-2"><Target size={14} className="text-neon-blue" /> Gauntlet-screened</span>
                <span className="flex items-center gap-2"><Sparkles size={14} className="text-neon-pink" /> AI-graded</span>
              </div>
            </div>

            {/* live stats panel */}
            <div className="lg:col-span-5">
              <ArcadeCard glow="green" className="bg-bg-panel/80">
                <p className="font-pixel text-[10px] text-neon-green mb-4">▸ LIVE STATS · {new Date().toLocaleDateString("en-IN")}</p>
                <div className="grid grid-cols-2 gap-4">
                  <StatBlock label="ACTIVE MISSIONS" value={metrics.activeMissions} color="green" />
                  <StatBlock label="GHOST RATE" value={metrics.ghostingRatePct} suffix="%" color="yellow" />
                  <StatBlock label="STUDENTS" value={metrics.totalStudents} color="blue" />
                  <StatBlock label="PLACEMENTS" value={metrics.placements} color="pink" />
                </div>
                {heroBanner && (
                  <div className="mt-5 border-t-2 border-bg-ink pt-4">
                    <p className="font-pixel text-[10px] text-neon-pink mb-1">▸ {heroBanner.headline}</p>
                    <p className="font-mono text-[11px] text-ink-muted">{heroBanner.subtext}</p>
                  </div>
                )}
              </ArcadeCard>
            </div>
          </div>
        </div>

        {/* marquee */}
        <div className="border-y-2 border-bg-ink bg-bg-panel py-3 marquee">
          <div className="marquee-track font-pixel text-[10px] text-neon-pink">
            {Array(2).fill(0).map((_, i) => (
              <span key={i} className="px-8 inline-flex items-center gap-8">
                {["▸ 24-HOUR SLA OR YOU JUMP THE QUEUE", "▸ GHOST-RATED RECRUITERS LOSE VISIBILITY", "▸ AI GAUNTLET · NO MORE 800-RESUME PILES", "▸ PHONEPE NATIVE · BOOTCAMPS UNLOCK MISSIONS", "▸ NO GHOST · NO CATCH"].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* MISSIONS PREVIEW */}
      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <SectionHeader
          eyebrow="DECK 02 / MISSIONS"
          title="Live Missions"
          subtitle="Every listing has an SLA. Every applicant takes a Gauntlet. Every reject gets feedback. No more black holes."
          color="pink"
        />
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {jobs.map((job) => {
            const co = companies.find((c) => c.id === job.companyId);
            return (
              <ArcadeCard key={job.id} glow="pink" interactive>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Badge tone="blue" className="mb-2">{co?.name ?? "—"}</Badge>
                    <h3 className="font-pixel text-base text-neon-pink mb-1">{job.title}</h3>
                    <p className="font-mono text-xs text-ink-muted mb-3">
                      {job.location} · {job.remote.toUpperCase()} · ₹{job.salaryMin}–{job.salaryMax} LPA
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {job.skills.slice(0, 4).map((s) => (
                        <Badge tone="muted" key={s}>{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge tone={job.slaHours <= 24 ? "green" : job.slaHours <= 48 ? "yellow" : "blue"}>
                      <Clock size={10} /> {job.slaHours}H SLA
                    </Badge>
                  </div>
                </div>
              </ArcadeCard>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Link href="/login">
            <PixelButton variant="green" size="lg">
              <Zap size={16} /> See All Missions
            </PixelButton>
          </Link>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t-2 border-bg-ink bg-bg-panel/40 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="DECK 03 / RULES"
            title="The Rules of the Arcade"
            color="blue"
          />
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            <RuleCard num="01" color="pink" title="DROP YOUR RESUME"
              copy="Magic Widget parses your PDF in 10 seconds. Skills, history, impact — all auto-tagged. You edit, you confirm." />
            <RuleCard num="02" color="green" title="TAKE THE GAUNTLET"
              copy="Each mission has one situational prompt. Write your real answer. AI grades depth, evidence, and trade-offs." />
            <RuleCard num="03" color="blue" title="GET A REAL REPLY"
              copy="Recruiters commit to 24/48/72-hour SLAs. Miss it, lose visibility. Hit it, get pre-screened, pre-assessed candidates." />
          </div>
        </div>
      </section>

      {/* COMPANIES */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <SectionHeader eyebrow="DECK 04 / GUILD" title="Companies on the Grid" color="yellow" />
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {companies.map((co) => (
            <ArcadeCard key={co.id} glow="yellow" className="text-center">
              <p className="font-pixel text-xs text-neon-yellow">{co.name}</p>
              <p className="font-mono text-[10px] text-ink-muted mt-1">{co.domain}</p>
            </ArcadeCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t-2 border-bg-ink mx-auto max-w-7xl px-6 py-16">
        <ArcadeCard glow="pink" className="text-center py-12">
          <p className="font-pixel text-[10px] text-neon-pink mb-4">▸ THE PROMISE</p>
          <h3 className="font-pixel text-2xl md:text-3xl neon-text text-neon-green mb-4">
            NO GHOST. NO CATCH.
          </h3>
          <p className="text-ink-muted font-mono text-sm max-w-xl mx-auto mb-6">
            Recruiters who don&apos;t reply in time get ghost-rated. Students who don&apos;t answer the Gauntlet don&apos;t get reviewed. Symmetry built in.
          </p>
          <Link href="/login">
            <PixelButton variant="pink" size="lg">
              <Rocket size={16} /> Unlock Your Terminal
            </PixelButton>
          </Link>
        </ArcadeCard>
      </section>

      <footer className="border-t-2 border-bg-ink py-6 px-6">
        <p className="text-center font-mono text-[10px] text-ink-dim">
          NO/GHOST · Built for the people who answer the call · PhonePe + Vercel
        </p>
      </footer>

      <MagicWidget />
    </main>
  );
}

function StatBlock({
  label,
  value,
  suffix,
  color,
}: {
  label: string;
  value: number;
  suffix?: string;
  color: "pink" | "green" | "blue" | "yellow";
}) {
  return (
    <div className="border-2 border-bg-ink bg-bg-base p-3">
      <p className="font-mono text-[9px] text-ink-muted mb-1">{label}</p>
      <ScoreCounter value={value} suffix={suffix} color={color} className="text-xl" />
    </div>
  );
}

function RuleCard({
  num,
  color,
  title,
  copy,
}: {
  num: string;
  color: "pink" | "green" | "blue";
  title: string;
  copy: string;
}) {
  const cls = color === "pink" ? "text-neon-pink" : color === "green" ? "text-neon-green" : "text-neon-blue";
  return (
    <ArcadeCard glow={color}>
      <p className={`font-pixel text-3xl ${cls} neon-text mb-3`}>{num}</p>
      <h4 className={`font-pixel text-sm ${cls} mb-2`}>{title}</h4>
      <p className="font-mono text-xs text-ink-muted">{copy}</p>
    </ArcadeCard>
  );
}

function SearchBar() {
  return (
    <form action="/login" className="flex flex-wrap gap-2 max-w-xl">
      <input
        name="q"
        className="pixel-input flex-1 min-w-[240px]"
        placeholder="Search by superpower (AI PO, Python…)"
      />
      <select className="pixel-input">
        <option>Any Location</option>
        <option>Bengaluru</option>
        <option>Mumbai</option>
        <option>Remote (India)</option>
      </select>
    </form>
  );
}
