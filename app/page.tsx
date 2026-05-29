import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  ArrowRight,
  Mail,
  Target,
  Twitter,
  Linkedin,
  Upload,
  Zap,
  TrendingDown,
  CheckCircle2,
  BadgeCheck,
  MessageSquare,
  Award,
} from "lucide-react";
import { GlassNavbar, Logo } from "@/components/glass";
import {
  Badge,
  Button,
  Card,
  SectionLabel,
} from "@/components/ui";
import { HeroDemoLoop } from "@/components/landing/HeroDemoLoop";
import { HeroCTAs } from "@/components/landing/HeroCTAs";
import { ScrollPrompt } from "@/components/landing/ScrollPrompt";
import dynamic from "next/dynamic";
// Below-fold — lazy-load to keep initial bundle small
const FAQ = dynamic(() =>
  import("@/components/landing/FAQ").then((m) => ({ default: m.FAQ })),
);
const CookieConsent = dynamic(() =>
  import("@/components/landing/CookieConsent").then((m) => ({
    default: m.CookieConsent,
  })),
);
import { LiveSessionsTeaser } from "@/components/live/LiveSessionsTeaser";
import {
  MotionSection,
  RevealText,
  CountUp,
  MagneticCard,
  StaggerGrid,
  StaggerItem,
  ParallaxBackdrop,
  ScrollProgress,
} from "@/components/landing/motion";

// Planned bootcamp tracks — launching with the first cohort. Static by design:
// no fake catalog data until real bootcamps go live.
const PLANNED_TRACKS = [
  "Frontend Engineering (React)",
  "Backend Engineering (Node.js)",
  "Data Analytics (SQL + Python)",
  "Data Science & ML",
  "Product Management",
  "UI/UX Design",
  "DevOps & Cloud (AWS)",
  "Digital Marketing",
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "student") redirect("/dashboard");
  if (session?.user?.role === "recruiter") redirect("/recruiter/command");
  if (session?.user?.role === "admin") redirect("/admin/today");
  if (session?.user?.role === "instructor") redirect("/instructor/today");

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip" }}>
      <ParallaxBackdrop />
      <ScrollProgress />
      <GlassNavbar />
      <CookieConsent />

      {/* ─────────── HERO ─────────── */}
      <section className="mx-auto max-w-content px-4 pt-12 md:pt-20 pb-8 relative">
        {/* Grid overlay — editorial Vercel-style backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(1,145,252,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(1,145,252,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 60% 50% at 50% 30%, black 30%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 50% at 50% 30%, black 30%, transparent 70%)",
          }}
        />

        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="font-display font-extrabold tracking-tightest text-5xl md:text-7xl text-neutral-950 leading-[1.02] headline-twotone">
              <RevealText
                segments={[
                  "We don't ghost.",
                  <br key="br" />,
                  <span className="accent" key="accent">
                    We unGhost.
                  </span>,
                ]}
                stagger={0.07}
                delay={0.15}
                trigger="mount"
              />
            </h1>
            <MotionSection
              as="p"
              className="text-body-lg text-neutral-500 max-w-xl leading-relaxed"
              delay={0.5}
              y={16}
              amount={0}
            >
              India&apos;s first hiring platform where HR actually responds.
              Every recruiter commits to a public SLA. Miss it, your
              application is refunded.
            </MotionSection>

            <MotionSection
              as="div"
              delay={0.75}
              y={16}
              amount={0}
            >
              <HeroCTAs />
            </MotionSection>

            <MotionSection
              as="p"
              className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-6 text-sm text-neutral-500"
              delay={0.95}
              y={12}
              amount={0}
            >
              <span>24/48/72h SLA</span>
              <span className="w-1 h-1 rounded-full bg-brand-500/60" />
              <span>AI-graded scenarios</span>
              <span className="w-1 h-1 rounded-full bg-brand-500/60" />
              <span>Live bootcamps</span>
            </MotionSection>
          </div>

          {/* Magic Widget */}
          <MotionSection
            as="div"
            className="lg:col-span-5"
            delay={0.35}
            y={0}
            amount={0}
          >
            <HeroDemoLoop />
          </MotionSection>
        </div>
        <ScrollPrompt />
      </section>

      {/* ─────────── LIVE SESSIONS TEASER ─────────── */}
      <MotionSection amount={0.3}>
        <LiveSessionsTeaser />
      </MotionSection>

      {/* ─────────── HOW IT WORKS ─────────── */}
      <MotionSection
        className="mx-auto max-w-content px-4 py-20"
        amount={0.15}
      >
        <SectionHeader
          title="Drop, match, prove, hear back."
          subtitle="Four steps from resume to a real reply."
        />
        <div className="relative mt-14">
          {/* Connecting rail — desktop only, sits behind the numerals */}
          <div
            aria-hidden
            className="hidden lg:block absolute left-0 right-0 top-7 h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent"
          />
          <StaggerGrid
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12"
            stagger={0.08}
          >
            {(
              [
                {
                  num: "01",
                  icon: <Upload size={18} />,
                  title: "Drop your resume",
                  copy: "AI parses skills, history, impact in seconds. Edit, confirm, set your trajectory.",
                },
                {
                  num: "02",
                  icon: <Target size={18} />,
                  title: "Get matched",
                  copy: "Vector search ranks jobs against your skills, experience, trajectory. Tier A to D.",
                },
                {
                  num: "03",
                  icon: <Zap size={18} />,
                  title: "Prove your fit",
                  copy: "Take a real scenario per role. AI grades depth, integrity, evidence.",
                },
                {
                  num: "04",
                  icon: <CheckCircle2 size={18} />,
                  title: "Hear back, guaranteed",
                  copy: "Recruiters reply in 24/48/72 hours or your application credit is refunded.",
                },
              ] as const
            ).map((step) => (
              <StaggerItem key={step.num}>
                <FlowStep {...step} />
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </MotionSection>

      {/* ─────────── THE PROBLEM ─────────── */}
      <MotionSection
        className="mx-auto max-w-content px-4 py-20"
        amount={0.2}
      >
        <div className="rounded-2xl bg-neutral-950 text-white px-8 py-16 md:py-20 text-center relative overflow-hidden">
          {/* Animated red pulse gradient */}
          <div
            aria-hidden
            className="absolute inset-0 problem-pulse"
            style={{
              background:
                "radial-gradient(800px 400px at 50% 0%, rgba(220,38,38,0.25), transparent 60%)",
            }}
          />
          {/* Travelling scanlines */}
          <div aria-hidden className="absolute inset-0 overflow-hidden">
            <div className="scanline-1 absolute left-0 right-0 h-px bg-white/10" />
            <div className="scanline-2 absolute left-0 right-0 h-px bg-white/8" />
          </div>

          <div className="relative">
            <SectionLabel className="!text-error mb-5 justify-center">
              <TrendingDown size={12} /> The problem
            </SectionLabel>
            <h2 className="font-display font-extrabold text-display-xl md:text-6xl text-white max-w-3xl mx-auto mb-5 tracking-tightest leading-[1.05]">
              <RevealText
                segments={[
                  "You apply. ",
                  <span className="text-white/40" key="void">
                    Then nothing.
                  </span>,
                ]}
                stagger={0.06}
                motionStyle="tween"
                trigger="view"
                amount={0.3}
              />
            </h2>
            <p className="text-body-md text-white/70 max-w-2xl mx-auto leading-relaxed">
              Job boards optimise for volume, not replies. Applications vanish
              into a void with no deadline and no accountability. We made
              ghosting cost the recruiter, not you: every role carries a
              response deadline, and if it&apos;s missed, your application
              credit comes back.
            </p>
          </div>
        </div>
      </MotionSection>

      {/* ─────────── THE SLA MECHANIC ─────────── */}
      <MotionSection
        className="mx-auto max-w-content px-4 py-20"
        amount={0.15}
      >
        <SectionHeader
          eyebrow="The guarantee"
          title="Reply or refund. No exceptions."
          subtitle="Every recruiter picks a response window before a role goes live. The clock is public. Miss it and your application credit returns automatically."
        />
        <div className="mt-14 relative">
          {/* Horizontal countdown rail */}
          <div
            aria-hidden
            className="absolute left-0 right-0 top-[1.15rem] h-0.5 rounded-full bg-gradient-to-r from-error/40 via-warning/40 to-info/40"
          />
          <StaggerGrid
            className="grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-12"
            stagger={0.1}
          >
            {(
              [
                {
                  hrs: "24h",
                  label: "Priority",
                  copy: "Fast-track roles. A recruiter answers within a day or the credit is back.",
                  dot: "bg-error",
                  text: "text-error",
                },
                {
                  hrs: "48h",
                  label: "Standard",
                  copy: "The default commitment. Two business days, tracked against a public clock.",
                  dot: "bg-warning",
                  text: "text-warning",
                },
                {
                  hrs: "72h",
                  label: "Extended",
                  copy: "High-volume roles. Longer window, same hard guarantee at the end of it.",
                  dot: "bg-info",
                  text: "text-info",
                },
              ] as const
            ).map((t) => (
              <StaggerItem key={t.hrs}>
                <div className="relative pt-12">
                  <span
                    className={`absolute top-0 left-0 grid place-items-center w-9 h-9 rounded-full bg-neutral-0 shadow-elev-2 ring-1 ring-neutral-200`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${t.dot}`} />
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`font-display font-extrabold text-display-lg tnum leading-none ${t.text}`}
                    >
                      {t.hrs}
                    </span>
                    <span className="section-label">{t.label}</span>
                  </div>
                  <p className="text-body-sm text-neutral-500 leading-relaxed mt-3 max-w-[34ch]">
                    {t.copy}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGrid>
        </div>
      </MotionSection>

      {/* ─────────── TWO SIDES ─────────── */}
      <MotionSection
        className="mx-auto max-w-content px-4 py-20"
        amount={0.15}
      >
        <SectionHeader
          title="No ghost. Either direction."
          subtitle="One promise that holds for the person applying and the person hiring."
        />
        <div className="mt-10 grid md:grid-cols-2 rounded-2xl overflow-hidden ring-1 ring-neutral-200 shadow-elev-3">
          {/* Students half — brand-tinted */}
          <div className="bg-brand-50/50 p-8 md:p-10 flex flex-col">
            <Badge tone="info" className="mb-4 self-start">
              For Students
            </Badge>
            <h3 className="font-display font-bold text-display-md text-neutral-900 tracking-tight mb-4">
              Stop applying into a void.
            </h3>
            <ul className="space-y-3 text-body-sm text-neutral-700 mb-8 flex-grow">
              {[
                "AI-matched jobs, not keyword spam",
                "Free credit refund if a recruiter ghosts",
                "AI Career Coach with cross-session memory",
                "Bootcamps with Verified Skill badges",
                "Top-10 leaderboard featured to recruiters",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2.5">
                  <CheckCircle2
                    size={16}
                    className="text-brand-500 mt-0.5 shrink-0"
                  />
                  {p}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="self-start">
              <Button
                variant="primary"
                size="md"
                trailingIcon={<ArrowRight size={14} />}
              >
                Get started free
              </Button>
            </Link>
          </div>

          {/* Recruiters half — clean white, divider between */}
          <div className="bg-neutral-0 p-8 md:p-10 flex flex-col border-t md:border-t-0 md:border-l border-neutral-200">
            <Badge tone="success" className="mb-4 self-start">
              For Recruiters
            </Badge>
            <h3 className="font-display font-bold text-display-md text-neutral-900 tracking-tight mb-4">
              Hire pre-qualified candidates.
            </h3>
            <ul className="space-y-3 text-body-sm text-neutral-700 mb-8 flex-grow">
              {[
                "Tier A to D candidates ranked by AI relevancy",
                "Custom pipelines with per-stage SLAs",
                "AI-generated 30-question assessment banks",
                "Anonymised candidate database with bias controls",
                "Bootcamp sponsorship to close gaps on demand",
                "Free forever for posting and hiring",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2.5">
                  <CheckCircle2
                    size={16}
                    className="text-success mt-0.5 shrink-0"
                  />
                  {p}
                </li>
              ))}
            </ul>
            <Link href="/signup?role=recruiter" className="self-start">
              <Button
                variant="secondary"
                size="md"
                trailingIcon={<ArrowRight size={14} />}
              >
                Post your first job free
              </Button>
            </Link>
          </div>
        </div>
      </MotionSection>

      {/* ─────────── BOOTCAMPS PREVIEW ─────────── */}
      <MotionSection
        className="mx-auto max-w-content px-4 py-20"
        amount={0.15}
      >
        <SectionHeader
          title="Close the gap before you apply."
          subtitle="Recorded modules, a live workshop, and an AI-graded assignment. Pass and you earn a Verified Skill badge recruiters can filter on. First tracks launching with our cohort:"
        />
        <StaggerGrid
          className="mt-10 flex flex-wrap gap-3"
          stagger={0.05}
        >
          {PLANNED_TRACKS.map((track) => (
            <StaggerItem key={track}>
              <span className="inline-flex items-center gap-2 rounded-full bg-neutral-0 ring-1 ring-neutral-200 pl-3 pr-4 py-2 text-body-sm font-medium text-neutral-800 shadow-elev-1">
                <BadgeCheck size={15} className="text-brand-500 shrink-0" />
                {track}
              </span>
            </StaggerItem>
          ))}
        </StaggerGrid>
        <p className="text-body-sm text-neutral-500 mt-5">
          More tracks added as recruiters tell us what they&apos;re hiring for.
        </p>
      </MotionSection>

      {/* ─────────── THE OUTCOME ─────────── */}
      <MotionSection
        className="mx-auto max-w-content px-4 py-20"
        amount={0.15}
      >
        <div className="rounded-2xl bg-brand-50/60 ring-1 ring-brand-100 px-8 py-14 md:px-12 md:py-16">
          <div className="max-w-3xl">
            <h2 className="font-display font-extrabold text-display-lg md:text-5xl text-neutral-950 tracking-tighter leading-[1.06]">
              You&apos;re here to get hired.{" "}
              <span className="text-brand-600">Not to apply into silence.</span>
            </h2>
            <p className="text-body-md text-neutral-600 mt-4 leading-relaxed max-w-2xl">
              unGhost isn&apos;t a bigger job board. Every role carries a
              response deadline and an AI-graded proof step, so your application
              ends in a real reply — and the ones that fit, in a real interview.
            </p>
          </div>

          <div className="mt-10 grid sm:grid-cols-3 gap-y-8 sm:gap-y-0 sm:divide-x divide-brand-100">
            {(
              [
                {
                  icon: <MessageSquare size={18} />,
                  title: "A reply, guaranteed",
                  copy: "Recruiters answer inside their SLA or your application credit comes back. No silence.",
                },
                {
                  icon: <Award size={18} />,
                  title: "Proof over keywords",
                  copy: "Skill scenarios graded by AI for depth and integrity, then shown to recruiters.",
                },
                {
                  icon: <Target size={18} />,
                  title: "Interviews that count",
                  copy: "Matched to roles you actually fit, ranked Tier A to D — not blasted into a void.",
                },
              ] as const
            ).map((o, i) => (
              <div key={o.title} className={i === 0 ? "sm:pr-8" : "sm:px-8"}>
                <span className="grid place-items-center w-11 h-11 rounded-xl bg-neutral-0 text-brand-500 shadow-elev-2 ring-1 ring-brand-100 mb-4">
                  {o.icon}
                </span>
                <h3 className="font-display font-bold text-lg text-neutral-900 mb-1.5 tracking-tight">
                  {o.title}
                </h3>
                <p className="text-body-sm text-neutral-600 leading-relaxed max-w-[34ch]">
                  {o.copy}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link href="/signup">
              <Button
                variant="primary"
                size="md"
                trailingIcon={<ArrowRight size={14} />}
              >
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      </MotionSection>

      {/* ─────────── PRICING ─────────── */}
      <MotionSection
        className="mx-auto max-w-content px-4 py-20"
        amount={0.15}
      >
        <SectionHeader
          title="Try 2 free. Upgrade once."
          subtitle="Recruiters post and hire free. Students pick a plan that fits."
        />
        <StaggerGrid
          className="grid md:grid-cols-2 gap-5 mt-10 max-w-3xl mx-auto"
          stagger={0.1}
        >
          <StaggerItem>
            <MagneticCard className="h-full">
              <PriceCard
                tier="Free"
                priceNode={
                  <span className="font-display font-extrabold text-4xl text-neutral-950 tnum">
                    ₹0
                  </span>
                }
                sub="trial"
                features={[
                  "2 applications (lifetime trial)",
                  "Browse all bootcamps + jobs",
                  "Refunds on recruiter ghost",
                  "Upgrade anytime",
                ]}
                cta="Start free"
                href="/signup"
              />
            </MagneticCard>
          </StaggerItem>
          <StaggerItem>
            <MagneticCard className="h-full">
              <PriceCard
                tier="Premium"
                priceNode={
                  <span className="font-display font-extrabold text-4xl text-neutral-950 tnum">
                    <CountUp to={4999} prefix="₹" format duration={2} />
                  </span>
                }
                sub="one-time · lifetime"
                features={[
                  "Unlimited applications",
                  "AI Coach + Q&A forever",
                  "Every bootcamp included",
                  "Priority refund queue",
                ]}
                cta="Go Premium"
                href="/upgrade?to=premium"
                highlight
              />
            </MagneticCard>
          </StaggerItem>
        </StaggerGrid>
        <p className="text-center text-body-xs text-neutral-500 mt-6">
          GST 18% inclusive · All sales final · Pay by UPI
        </p>
      </MotionSection>

      {/* ─────────── FAQ ─────────── */}
      <MotionSection
        className="mx-auto max-w-content px-4 py-20"
        amount={0.15}
      >
        <SectionHeader eyebrow="FAQ" title="The honest questions." />
        <div className="mt-10">
          <FAQ />
        </div>
      </MotionSection>

      {/* ─────────── FINAL CTA ─────────── */}
      <MotionSection
        className="mx-auto max-w-5xl px-4 py-20"
        amount={0.2}
        y={32}
      >
        <div className="relative">
          {/* Radial glow behind card */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 cta-glow"
            style={{
              background:
                "radial-gradient(600px 300px at 50% 50%, rgba(1,145,252,0.18), transparent 70%)",
            }}
          />
          <Card
            surface="glass-tinted"
            className="!py-14 !px-8 text-center !rounded-2xl relative overflow-hidden"
          >
            {/* Dot grid overlay */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle, rgba(1,145,252,0.12) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative">
              <SectionLabel tone="brand" className="mb-5 justify-center">
                The promise
              </SectionLabel>
              <h3 className="font-display font-extrabold text-display-xl text-neutral-950 mb-5 leading-tight tracking-tightest headline-twotone">
                <RevealText
                  segments={[
                    "No ghost.",
                    " ",
                    <span className="accent" key="acc">
                      No catch.
                    </span>,
                  ]}
                  stagger={0.08}
                  trigger="view"
                  amount={0.4}
                />
              </h3>
              <p className="text-body-md text-neutral-500 max-w-xl mx-auto mb-8 leading-relaxed">
                Recruiters who don&apos;t reply in time lose visibility.
                Students who skip the gauntlet don&apos;t get reviewed.
                Symmetry, built in.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="cta-primary-glow">
                  <Button
                    variant="primary"
                    size="lg"
                    trailingIcon={<ArrowRight size={16} />}
                  >
                    I&apos;m looking
                  </Button>
                </Link>
                <Link href="/signup?role=recruiter">
                  <Button
                    variant="secondary"
                    size="lg"
                    trailingIcon={<ArrowRight size={16} />}
                  >
                    I&apos;m hiring
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </MotionSection>

      {/* ─────────── FOOTER ─────────── */}
      <MotionSection
        as="footer"
        className="border-t border-neutral-200 mt-10 pt-12 pb-8"
        amount={0.05}
        y={12}
      >
        <div className="mx-auto max-w-content px-4 grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Logo size="sm" />
            <p className="text-body-xs text-neutral-500 mt-3 max-w-xs leading-relaxed">
              India-first hiring platform with anti-ghosting SLAs and embedded
              skill bootcamps. Built in Mumbai. DPDP Act compliant.
            </p>
            <div className="flex gap-2 mt-4">
              <a
                href="https://x.com/unghost"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="unGhost on X"
                className="social-icon grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-brand-500 hover:bg-brand-500 hover:text-white transition"
              >
                <Twitter size={14} />
              </a>
              <a
                href="https://www.linkedin.com/company/unghost"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="unGhost on LinkedIn"
                className="social-icon grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-brand-500 hover:bg-brand-500 hover:text-white transition"
              >
                <Linkedin size={14} />
              </a>
              <a
                href="mailto:hello@unghost.in"
                aria-label="Email unGhost"
                className="social-icon grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-brand-500 hover:bg-brand-500 hover:text-white transition"
              >
                <Mail size={14} />
              </a>
            </div>
          </div>
          <FootCol
            title="For Students"
            links={[
              ["Find Jobs", "/signup"],
              ["Bootcamps", "/bootcamps"],
              ["AI Coach", "/signup"],
              ["Pricing", "/pricing"],
            ]}
          />
          <FootCol
            title="For Recruiters"
            links={[
              ["Post Job", "/signup?role=recruiter"],
              ["Database Search", "/signup?role=recruiter"],
              ["Sponsorship", "/for-recruiters"],
              ["Anti-Ghost SLA", "/how-it-works"],
            ]}
          />
          <FootCol
            title="Company"
            links={[
              ["About", "/about"],
              ["Contact", "/contact"],
              ["Careers", "/careers"],
              ["Press", "/press"],
            ]}
          />
          <FootCol
            title="Legal"
            links={[
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
              ["Refund Policy", "/refund-policy"],
              ["DPDP", "/dpdp"],
            ]}
          />
        </div>
        <div className="mx-auto max-w-content px-4 mt-10 pt-6 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-body-xs text-neutral-500">
          <p>
            © {new Date().getFullYear()} unGhost Technologies Pvt Ltd · Mumbai,
            India
          </p>
          <p>
            Data residency: ap-south-1 · Made with{" "}
            <img
              src="/symbol.svg"
              alt="unGhost"
              width={12}
              height={12}
              className="inline align-text-bottom"
            />{" "}
            in India
          </p>
        </div>
      </MotionSection>
    </main>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap">
      <div className="max-w-2xl">
        {eyebrow && (
          <SectionLabel tone="brand" className="mb-2">
            {eyebrow}
          </SectionLabel>
        )}
        <h2 className="font-display font-extrabold text-display-lg text-neutral-950 tracking-tighter">
          <RevealText
            segments={[title]}
            stagger={0.05}
            trigger="view"
            motionStyle="tween"
            amount={0.3}
          />
        </h2>
        {subtitle && (
          <p className="text-body-md text-neutral-500 mt-3 leading-relaxed max-w-prose">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

function FlowStep({
  num,
  icon,
  title,
  copy,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="relative">
      {/* Node: icon chip floats on the rail, oversized step numeral behind */}
      <div className="flex items-center gap-4 mb-5">
        <span className="relative z-10 grid place-items-center w-14 h-14 rounded-2xl bg-neutral-0 text-brand-500 shadow-elev-3 ring-1 ring-neutral-200/80 transition-transform duration-fast ease-out-soft group-hover:-translate-y-0.5">
          {icon}
        </span>
        <span
          className="font-display font-extrabold text-3xl tnum leading-none text-neutral-950 select-none"
          style={{ letterSpacing: "-0.04em" }}
          aria-hidden
        >
          {num}
        </span>
      </div>
      <h4 className="font-display font-bold text-lg text-neutral-900 mb-1.5 tracking-tight">
        {title}
      </h4>
      <p className="text-body-sm text-neutral-500 leading-relaxed max-w-[26ch]">
        {copy}
      </p>
    </div>
  );
}

function PriceCard({
  tier,
  priceNode,
  sub,
  features,
  cta,
  href,
  highlight,
}: {
  tier: string;
  priceNode: React.ReactNode;
  sub: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Card
      selected={highlight}
      className={`!p-8 h-full ${highlight ? "shadow-elev-4 pro-float" : ""}`}
    >
      {highlight && (
        <Badge tone="info" className="mb-3 pop-in">
          Best value
        </Badge>
      )}
      <p className="font-display font-bold text-neutral-900 text-lg">{tier}</p>
      <div className="flex items-baseline gap-2 mt-2 mb-1">
        {priceNode}
        <span className="text-body-sm text-neutral-500">{sub}</span>
      </div>
      <ul className="space-y-2 my-6 text-body-sm text-neutral-700">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2
              size={14}
              className="text-brand-500 mt-0.5 shrink-0"
            />
            {f}
          </li>
        ))}
      </ul>
      <Link href={href}>
        <Button
          variant={highlight ? "primary" : "secondary"}
          size="md"
          fullWidth
        >
          {cta}
        </Button>
      </Link>
    </Card>
  );
}

function FootCol({
  title,
  links,
}: {
  title: string;
  links: Array<[string, string]>;
}) {
  return (
    <div>
      <p className="font-display font-semibold text-body-sm text-neutral-900 mb-3">
        {title}
      </p>
      <ul className="space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-body-xs text-neutral-500 hover:text-brand-500 transition"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
