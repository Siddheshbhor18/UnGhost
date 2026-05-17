import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Ghost,
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
          <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-brand-gradient text-white shadow-brand-glow mb-4">
            <Ghost size={28} />
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
              SLA. Miss it, the candidate&apos;s application credit refunds,
              and the recruiter&apos;s public ghost-rate increments. Reputation,
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

        {/* Numbers */}
        <GlassCard className="mb-5">
          <p className="text-[10px] uppercase tracking-wider text-brand-primary font-semibold mb-3">
            Numbers that matter
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Avg recruiter response" value="8h" tone="success" />
            <Stat label="Platform ghost-rate" value="1.2%" tone="success" />
            <Stat label="Industry average" value="38%" tone="danger" />
            <Stat label="Top-10 → Hire multiplier" value="3.2×" tone="brand" />
          </div>
          <p className="text-[11px] text-brand-muted mt-3">
            Updated weekly from live platform data. Source: the entire database.
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
            Free to start. 5 applications/month. AI Coach. Refunds when
            recruiters ghost.
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "success" | "warn" | "danger";
}) {
  const cls =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "danger"
      ? "text-rose-600"
      : "text-brand-primary";
  return (
    <div className="bg-white/40 rounded-xl border border-brand-ink/5 p-3 text-center">
      <p className="text-[9px] uppercase tracking-wider text-brand-muted font-semibold">
        {label}
      </p>
      <p className={`font-display text-2xl font-bold mt-1 ${cls}`}>{value}</p>
    </div>
  );
}
