// Pure-static marketing copy — opt into ISR with a 1h revalidate window. Even
// if our copy team updates the page mid-day, users see fresh content within
// the hour and we serve from edge cache the rest of the time.
export const revalidate = 3600;

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Mail,
  MapPin,
  Sparkles,
  TrendingDown,
  Users as UsersIcon,
} from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  GlassNavbar,
} from "@/components/glass";

export const metadata = { title: "About · unGhost" };

export default function AboutPage() {
  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />

      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-5"
        >
          <ArrowLeft size={14} /> Home
        </Link>

        {/* Hero */}
        <GlassCard variant="strong" className="!p-8 mb-6 text-center">
          <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-brand-gradient shadow-brand-glow mb-4">
            <img
              src="/symbol.svg"
              alt="unGhost"
              width={34}
              height={34}
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          <GlassBadge tone="brand">
            <Heart size={11} /> Made in Mumbai
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-3">
            We don&apos;t ghost. We unGhost.
          </h1>
          <p className="text-base text-brand-muted mt-3 leading-relaxed max-w-xl mx-auto">
            India&apos;s first hiring platform where HR actually responds. Built
            to fix the 75%-of-applications-into-the-void problem.
          </p>
        </GlassCard>

        {/* The Why */}
        <GlassCard className="mb-5">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <TrendingDown size={11} /> The why
          </p>
          <div className="space-y-3 text-sm text-brand-ink/85 leading-relaxed">
            <p>
              I applied to <strong>312 jobs</strong> in 2023. Heard back from{" "}
              <strong>4</strong>. None of them progressed past Stage 1. That&apos;s
              roughly 1.3% — and matches every other Indian candidate&apos;s
              experience.
            </p>
            <p>
              We talked to 200 students + 60 recruiters. The recruiter side was
              brutally honest: they get 800 applications per role, can&apos;t
              respond to most, and feel guilty about it. Naukri and LinkedIn
              optimise for volume — that&apos;s the bug.
            </p>
            <p>
              unGhost flips the marketplace: every recruiter signs a public
              SLA. Miss it, the candidate&apos;s application slot is returned
              (it won&apos;t count against their limit), and the
              recruiter&apos;s public ghost-rate increments. Reputation,
              built in.
            </p>
          </div>
        </GlassCard>

        {/* The What */}
        <GlassCard className="mb-5">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles size={11} /> The what
          </p>
          <ul className="space-y-2 text-sm text-brand-ink/85">
            <li>
              <strong>AI-driven matching + AI-graded assessments.</strong>{" "}
              Vector search ranks jobs. Claude grades scenario responses.
              Recruiters see depth + integrity, not just keywords.
            </li>
            <li>
              <strong>Embedded skill bootcamps.</strong> Failed an assessment?
              The exact bootcamp that closes the gap is one click away. Top-10
              performers per cohort featured to recruiters.
            </li>
            <li>
              <strong>Recruiter sponsorship.</strong> See a borderline candidate?
              Fund their bootcamp. Watch them earn the badge in real-time.
            </li>
          </ul>
        </GlassCard>

        {/* What we measure */}
        <GlassCard className="mb-5">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
            What we&apos;ll hold ourselves to
          </p>
          <p className="text-sm text-brand-ink/85 leading-relaxed">
            We&apos;re pre-launch, so we won&apos;t quote platform numbers we
            haven&apos;t earned yet. The commitment is simple and public:
            recruiters pick a response window — 24, 48, or 72 hours — and every
            recruiter&apos;s ghosting rate is visible on their profile. Once
            cohorts are live, these stats publish here straight from real
            platform data — no rounding, no spin.
          </p>
        </GlassCard>

        {/* Team */}
        <GlassCard className="mb-5">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <UsersIcon size={11} /> The team
          </p>
          <p className="text-sm text-brand-ink/85 leading-relaxed">
            8 humans + 1 ghost mascot. Hiring across engineering, design, and
            content. If you want to work on the marketplace + AI grading layer,
            email{" "}
            <a
              href="mailto:careers@unghost.com"
              className="text-brand-primary underline font-semibold"
            >
              careers@unghost.com
            </a>{" "}
            with your three sharpest opinions about hiring.
          </p>
        </GlassCard>

        {/* Office */}
        <GlassCard className="mb-5">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3 flex items-center gap-1.5">
            <MapPin size={11} /> Where we are
          </p>
          <div className="space-y-1 text-sm text-brand-ink/85">
            <p className="font-semibold">unGhost Technologies Pvt Ltd</p>
            <p>BKC · Bandra (E) · Mumbai 400 051</p>
            <p>India · ap-south-1</p>
            <p className="text-xs text-brand-muted mt-2">
              CIN: UXXXXXMH2025PTCXXXXXX · GSTIN: 27XXXXX0000X1Z0
            </p>
          </div>
        </GlassCard>

        {/* CTA */}
        <GlassCard
          variant="strong"
          className="!p-7 text-center bg-gradient-to-br from-brand-primary/8 via-white/60 to-white/40"
        >
          <h3 className="font-display font-extrabold text-2xl text-brand-ink">
            Want to use the platform?
          </h3>
          <p className="text-sm text-brand-muted mt-2 mb-5">
            Free to start. AI Coach included. Your application slot comes back
            if a recruiter ghosts.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/signup" className="btn-brand">
              Find a job <ArrowRight size={14} />
            </Link>
            <Link href="/signup?role=recruiter" className="btn-glass">
              Hire without ghosting
            </Link>
          </div>
        </GlassCard>

        <p className="text-[11px] text-brand-muted text-center mt-6">
          Press inquiries:{" "}
          <a
            href="mailto:press@unghost.com"
            className="text-brand-primary underline"
          >
            press@unghost.com
          </a>{" "}
          ·{" "}
          <Link href="/contact" className="text-brand-primary underline">
            Contact us
          </Link>{" "}
          ·{" "}
          <a
            href="mailto:hello@unghost.com"
            className="text-brand-primary underline inline-flex items-center gap-1"
          >
            <Mail size={11} /> hello@unghost.com
          </a>
        </p>
      </div>
    </main>
  );
}
