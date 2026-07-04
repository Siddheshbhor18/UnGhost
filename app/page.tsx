import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Heart,
  Instagram,
  Linkedin,
  Mail,
} from "lucide-react";
import { Suspense } from "react";
import { GlassNavbar, Logo } from "@/components/glass";
import {
  Badge,
  Button,
  Card,
  SectionLabel,
} from "@/components/ui";
import { HeroDemoLoop } from "@/components/landing/HeroDemoLoop";
import { BootcampCardStack } from "@/components/landing/BootcampCardStack";
import { HeroCTAs } from "@/components/landing/HeroCTAs";
import { JobMarquee } from "@/components/landing/JobMarquee";
import { FeaturedSpeaker } from "@/components/landing/FeaturedSpeaker";
import { HeroReveal } from "@/components/landing/HeroReveal";
import { VoidReveal } from "@/components/landing/VoidReveal";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { StickyCTA } from "@/components/landing/StickyCTA";
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
  StaggerGrid,
  StaggerItem,
  ParallaxBackdrop,
  ScrollProgress,
} from "@/components/landing/motion";

import { CoursesSection } from "@/components/landing/CoursesSection";
import { formatPaiseAsINR } from "@/shared/lib/pricing";
import {
  COURSE_PRICE_PAISE,
  EVERYTHING_BUNDLE_PAISE,
} from "@/shared/lib/courses";
import { PLAN_PRICING } from "@/shared/types";

// Jobs pricing tiers shown on the landing. Prices flow from PLAN_PRICING and
// features mirror PLAN_LIMITS (applications · AI Coach · Q&A). Premium is
// retired, so it is not sold here.
const MONTHS_QUARTERLY = Math.round(
  (PLAN_PRICING.jobs_quarterly.durationDays ?? 90) / 30,
);
const MONTHS_ANNUAL = Math.round(
  (PLAN_PRICING.jobs_annual.durationDays ?? 365) / 30,
);
// Per-month figures make the annual plan's real advantage legible: the same
// features for roughly half the monthly cost. Derived from PLAN_PRICING so a
// price change never leaves the marketing math stale.
const STANDARD_PER_MONTH = Math.round(
  PLAN_PRICING.jobs_quarterly.amountINR / MONTHS_QUARTERLY,
);
const PRO_PER_MONTH = Math.round(
  PLAN_PRICING.jobs_annual.amountINR / MONTHS_ANNUAL,
);
const PRO_SAVINGS_PCT = Math.round(
  (1 - PRO_PER_MONTH / STANDARD_PER_MONTH) * 100,
);

const JOBS_TIERS = [
  {
    name: "Free",
    price: formatPaiseAsINR(0),
    cadence: "to start",
    perMonth: null,
    note: null,
    badge: null,
    features: [
      "2 applications (lifetime trial)",
      "Browse every job & bootcamp",
      "Slot returned if a recruiter ghosts",
    ],
    cta: "Start free",
    href: "/signup?next=/student/jobs",
    highlight: false,
  },
  {
    name: "Standard",
    price: formatPaiseAsINR(PLAN_PRICING.jobs_quarterly.amountINR * 100),
    cadence: "for 3 months",
    perMonth: `about ${formatPaiseAsINR(STANDARD_PER_MONTH * 100)}/mo`,
    note: null,
    badge: null,
    features: [
      "Unlimited applications",
      "AI Coach on every application",
      "Q&A with recruiters",
    ],
    cta: "Get 3 months",
    href: "/upgrade",
    highlight: false,
  },
  {
    name: "Pro",
    price: formatPaiseAsINR(PLAN_PRICING.jobs_annual.amountINR * 100),
    cadence: "for 12 months",
    perMonth: `about ${formatPaiseAsINR(PRO_PER_MONTH * 100)}/mo`,
    note: `${PRO_SAVINGS_PCT}% cheaper per month than Standard`,
    badge: "Best value",
    features: [
      "Unlimited applications",
      "AI Coach on every application",
      "Q&A with recruiters",
    ],
    cta: "Get 1 year",
    href: "/upgrade",
    highlight: true,
  },
] as const;

export default async function LandingPage() {
  // Detect a signed-in visitor so we can route them to their app home. This is
  // best-effort: if the lookup fails (transient auth/DB outage), degrade to the
  // logged-out marketing view rather than cascading the failure into a 500 on a
  // public page.
  const session = await getServerSession(authOptions).catch(() => null);
  if (session?.user?.role === "student") redirect("/dashboard");
  if (session?.user?.role === "recruiter") redirect("/recruiter/command");
  if (session?.user?.role === "admin") redirect("/admin/today");
  if (session?.user?.role === "instructor") redirect("/instructor/today");

  return (
    <main className="relative min-h-[100dvh]" style={{ overflowX: "clip" }}>
      <SmoothScroll />
      <ParallaxBackdrop />
      <ScrollProgress />
      <GlassNavbar />
      <Suspense fallback={null}>
        <CookieConsent />
      </Suspense>
      <StickyCTA />

      {/* ─────────── HERO ─────────── */}
      {/* Reveal stage — isolates the sticky hero's pin + z-index so it never
          bleeds past the void section into the rest of the page. */}
      <div className="relative isolate">
      <HeroReveal overlaySelector="#void-section">
      <section className="mx-auto max-w-content px-4 pt-16 md:pt-24 pb-12 relative">
        {/* Ambient glass-mesh backdrop — full-bleed beyond the content container so the warm
            brand orbs span the whole hero, not just the 1080px reading column. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-[25vw] inset-y-0 -z-10 mesh-hero opacity-80"
        />

        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl text-neutral-950 leading-[1.02] headline-twotone">
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
              className="text-body-lg text-neutral-900 max-w-xl leading-relaxed"
              delay={0.5}
              y={16}
              amount={0}
            >
              India&apos;s first hiring platform where HR actually responds.
              Every recruiter commits to a public response window (24, 48, or
              72 hours) before a role goes live.
            </MotionSection>

            {/* Loss-aversion callout — promoted from a chip caption to its
                own visible line. The strongest psychological hook on the
                page earns the slot right above the CTAs. */}
            <MotionSection
              as="p"
              className="text-body-md text-neutral-700 max-w-xl leading-snug"
              delay={0.62}
              y={12}
              amount={0}
            >
              Miss the window? Your slot returns to the pool and it won&apos;t
              count against your limit.
            </MotionSection>

            <MotionSection
              as="div"
              delay={0.74}
              y={16}
              amount={0}
            >
              <HeroCTAs />
            </MotionSection>

            {/* Honest proof strip: mechanics we actually enforce, no invented
                metrics (PRODUCT.md bans fake stats). Sits directly under the
                CTAs so the promise carries evidence the moment it's read. */}
            <MotionSection
              as="div"
              className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-5 text-body-sm text-neutral-600"
              delay={0.82}
              y={12}
              amount={0}
            >
              {[
                "Public response SLA on every role",
                "Credit refunded if a recruiter ghosts",
                "AI-graded fit, no black box",
                "Data in Mumbai, DPDP compliant",
              ].map((point) => (
                <span key={point} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-500 shrink-0" />
                  {point}
                </span>
              ))}
            </MotionSection>

            {/* Mobile-only demo, rendered BELOW the CTAs + proof so the primary
                action stays inside the first screen on phones. Desktop renders
                the same component in the right column; each instance is
                display:none at its non-matching breakpoint, so only one ticks
                at a time (one extra 2.2s setInterval, worth the mobile lift). */}
            <MotionSection
              as="div"
              className="lg:hidden -mx-4 sm:mx-0"
              delay={0.9}
              y={0}
              amount={0}
            >
              <HeroDemoLoop />
            </MotionSection>
          </div>

          {/* Desktop-only demo (mobile renders the same loop below the CTAs). */}
          <MotionSection
            as="div"
            className="hidden lg:block lg:col-span-5"
            delay={0.35}
            y={0}
            amount={0}
          >
            <HeroDemoLoop />
          </MotionSection>
        </div>
        
      </section>
      </HeroReveal>

      {/* ─────────── LIVE SESSIONS TEASER ─────────── */}
      <MotionSection amount={0.3} className="relative z-[1]">
        <LiveSessionsTeaser />
      </MotionSection>

      {/* ─────────── THE VOID — dark beat: black + single brand-blue key light (honest restraint), weight contrast ─────────── */}
      <section
        id="void-section"
        className="relative rounded-t-[32px] text-white shadow-[0_0_120px_rgba(0,0,0,0.6)] md:rounded-t-[40px]"
        style={{
          background:
            "radial-gradient(ellipse 110% 75% at 50% -15%, rgba(1,145,252,0.16) 0%, rgba(1,145,252,0.04) 32%, transparent 55%), #000000",
          zIndex: 10,
        }}
      >

        {/* The turn, scroll-scrubbed: the void holds on screen, the payoff
            (thesuccess.png) crossfades over it, then the beat releases to the
            role ticker and the sections that follow. */}
        <VoidReveal
          problem={
            <>
              <h2
                className="font-display font-black text-balance text-5xl md:text-6xl lg:text-7xl text-white leading-[0.98]"
                style={{ letterSpacing: "-0.03em" }}
              >
                <span className="block">
                  <RevealText
                    segments={["You apply."]}
                    stagger={0.06}
                    motionStyle="tween"
                    trigger="view"
                    amount={0.4}
                  />
                </span>
                {/* Backlit blue — solid brand-blue with a light-emission glow,
                    revealed to full uniform opacity (no dissolve / gradient). */}
                <span
                  className="block pb-1 font-display font-black not-italic leading-[0.98]"
                  style={{
                    color: "#4db5ff",
                    textShadow:
                      "0 0 28px rgba(1,145,252,0.55), 0 0 10px rgba(1,145,252,0.45)",
                  }}
                >
                  <RevealText
                    segments={["Then nothing."]}
                    stagger={0.06}
                    motionStyle="tween"
                    trigger="view"
                    amount={0.4}
                    delay={0.35}
                  />
                </span>
              </h2>
            </>
          }
          payoff={
            <>
              {/* The turn — mirrors beat 1: a big display headline with the
                  blue backlit accent on the word that changed. */}
              <h2
                className="font-display font-black text-balance text-5xl md:text-6xl lg:text-7xl text-white leading-[0.98]"
                style={{ letterSpacing: "-0.03em" }}
              >
                So we changed{" "}
                <span
                  className="not-italic"
                  style={{
                    color: "#4db5ff",
                    textShadow:
                      "0 0 28px rgba(1,145,252,0.55), 0 0 10px rgba(1,145,252,0.45)",
                  }}
                >
                  who pays
                </span>{" "}
                for the silence.
              </h2>
            </>
          }
        />

        {/* Persistent CTA — centered between the turn and the role ticker.
            Deliberately outside VoidReveal's scroll crossfade, so it is always
            visible rather than fading in with the payoff beat. */}
        <div className="relative z-[1] flex justify-center px-4 -mt-24 md:-mt-32">
          <Link
            href="/signup?next=/student/jobs"
            className="group inline-flex items-center gap-2 rounded-xl bg-brand-500 px-7 py-3.5 text-base font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_10px_30px_-8px_rgba(1,145,252,0.55)] transition-all duration-200 hover:bg-brand-600 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_14px_36px_-10px_rgba(1,145,252,0.7)] active:scale-[0.98]"
          >
            Browse jobs free
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Slim full-bleed ticker of sample roles with reply windows. */}
        <div className="relative mt-10 pb-12 md:mt-12 md:pb-14">
          <JobMarquee />
        </div>
      </section>
      </div>

      {/* ─────────── TWO WAYS — asymmetric: header in left rail, unified cards on right ─────────── */}
      <MotionSection
        className="mx-auto max-w-content px-4 py-16 md:py-28"
        amount={0.15}
      >
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Eyebrow header — sits in the left rail, breaking the centered-
              header monotony three sections in a row. */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
            <p className="text-body-sm uppercase tracking-wider font-semibold text-brand-500 mb-3">
              Two lanes, one platform
            </p>
            <h2 className="font-display font-extrabold text-display-lg text-neutral-950 tracking-tight leading-[1.05]">
              Pick the lane that fits today.
            </h2>
            <p className="text-body-lg text-neutral-900 mt-4 leading-relaxed max-w-md">
              Apply with guaranteed response windows. Or build the skills
              first. Most students do both. Bootcamp badges strengthen every
              application you send.
            </p>
          </div>

          {/* Unified panel — single ring, single shadow, single bg. The two
              sub-panels read as complements (Step 1 → Step 2), not as
              alternatives. An inline arrow chip between them signals flow. */}
          <div className="lg:col-span-8 grid md:grid-cols-2 overflow-hidden rounded-3xl bg-white/70 backdrop-blur-xl ring-1 ring-white/60 shadow-[0_8px_32px_rgba(10,10,10,0.06)]">
            {/* Bootcamps first — they feed into jobs */}
            <div className="p-8 md:p-9 flex flex-col border-b md:border-b-0 md:border-r border-white/50">
              <Badge tone="neutral" className="mb-5 self-start">
                Bootcamps
              </Badge>
              <h3 className="font-display font-bold text-display-md text-neutral-900 tracking-tight mb-4">
                Hands-on bootcamps with verified badges.
              </h3>
              <ul className="space-y-3 text-body-sm text-neutral-700 mb-10 flex-grow">
                {[
                  "Real projects designed by operators, not academics",
                  "Code, ship and review from day one",
                  "Earn Verified Skill badges recruiters see on your profile",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="text-neutral-700 mt-0.5 shrink-0"
                    />
                    {p}
                  </li>
                ))}
              </ul>
              <Link href="#bootcamps" className="self-start">
                <Button
                  variant="secondary"
                  size="md"
                  trailingIcon={<ArrowRight size={14} />}
                >
                  Explore bootcamps
                </Button>
              </Link>
            </div>

            {/* Jobs — what the bootcamps prepare you for. The brand tint on
                this side signals the destination (the primary product). */}
            <div className="p-8 md:p-10 flex flex-col bg-gradient-to-br from-brand-100/85 to-brand-200/70 backdrop-blur-xl ring-1 ring-inset ring-brand-300/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              <Badge tone="info" className="mb-5 self-start">
                Jobs
              </Badge>
              <h3 className="font-display font-bold text-display-md text-neutral-900 tracking-tight mb-4">
                Apply with confidence. Replies on the clock.
              </h3>
              <ul className="space-y-3 text-body-sm text-neutral-700 mb-10 flex-grow">
                {[
                  "Open roles matched to your skills",
                  "Guaranteed response countdowns on every application",
                  "Slot returned the instant a recruiter ghosts the window",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2.5">
                    <CheckCircle2
                      size={16}
                      className="text-brand-600 mt-0.5 shrink-0"
                    />
                    {p}
                  </li>
                ))}
              </ul>
              <Link href="/signup?next=/student/jobs" className="self-start">
                <Button
                  variant="primary"
                  size="md"
                  trailingIcon={<ArrowRight size={14} />}
                >
                  Browse jobs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* ─────────── FEATURED SPEAKER — Abhinav Jain Ranka workshop ─────────── */}
      <MotionSection
        id="featured-speaker"
        className="mx-auto max-w-content px-4 py-16 md:py-24 scroll-mt-24"
        amount={0.15}
      >
        <FeaturedSpeaker />
      </MotionSection>

      {/* ─────────── BOOTCAMP CARD STACK — animated showcase of the 6 courses, leads into storefront ─────────── */}
      <MotionSection
        className="mx-auto max-w-content px-4 py-16 md:py-24"
        amount={0.15}
      >
        <BootcampCardStack />
      </MotionSection>

      {/* ─────────── BOOTCAMPS STOREFRONT — anchor for #bootcamps deep links ─────────── */}
      <MotionSection
        id="bootcamps"
        className="mx-auto max-w-content px-4 py-16 md:py-24"
        amount={0.15}
      >
        <SectionHeader
          title="Pick your courses."
          subtitle="Buy only what you need. Smart bundles unlock the rest for free."
        />
        <div className="mt-10">
          <CoursesSection />
        </div>
      </MotionSection>

      {/* ─────────── PRICING — asymmetric: action sidebar breaks the symmetric-header chain ─────────── */}
      <section className="mx-auto max-w-content px-4 py-16 md:py-28">
        <SectionHeader
          title="Apply free. Upgrade once it's working."
          subtitle="Recruiters post and hire free. Students start with 2 applications, then pick the plan that fits."
          action={
            <Link
              href="/upgrade"
              className="text-body-sm font-semibold text-brand-500 hover:text-brand-600 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              Compare every plan
              <ArrowRight size={14} />
            </Link>
          }
        />

        <StaggerGrid
          className="grid md:grid-cols-3 gap-5 mt-10 max-w-5xl mx-auto"
          stagger={0.08}
        >
          {JOBS_TIERS.map((tier) => (
            <StaggerItem key={tier.name} className="h-full">
              <JobsTierCard {...tier} />
            </StaggerItem>
          ))}
        </StaggerGrid>
        <p className="text-center text-body-xs text-neutral-900 mt-6">
          Prices exclude 18% GST, added at checkout · Pay by UPI · Cancel anytime
        </p>

        {/* Courses callout — bootcamp pricing lives in the cart */}
        {/* Bootcamps cross-sell — pared down to a single line in the premium pass */}
        <p className="mt-12 max-w-5xl mx-auto text-center text-body-md text-neutral-900">
          Bootcamps sold separately:{" "}
          <span className="text-neutral-900 font-medium">
            {formatPaiseAsINR(COURSE_PRICE_PAISE)}
          </span>{" "}
          per course, or{" "}
          <span className="text-neutral-900 font-medium">
            {formatPaiseAsINR(EVERYTHING_BUNDLE_PAISE)}
          </span>{" "}
          for the full six with bundle unlocks.{" "}
          <Link
            href="#bootcamps"
            className="text-brand-500 hover:text-brand-600 font-medium inline-flex items-center gap-1"
          >
            Browse courses <ArrowRight size={12} />
          </Link>
        </p>
      </section>

      {/* ─────────── FAQ ─────────── */}
      <section className="mx-auto max-w-content px-4 py-16 md:py-28">
        <SectionHeader title="The honest questions." />
        <div className="mt-10">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-neutral-100" />}>
            <FAQ />
          </Suspense>
        </div>
      </section>

      {/* ─────────── FINAL CTA — BLACK ─────────── */}
      <MotionSection
        className="mx-auto max-w-5xl px-4 py-16 md:py-28"
        amount={0.2}
        y={32}
      >
        <div className="relative bg-neutral-950 text-white rounded-[32px] md:rounded-[40px] shadow-[0_0_80px_rgba(0,0,0,0.18)] overflow-hidden">
          <div className="relative px-8 md:px-12 py-16 md:py-20 text-center">
            <h3 className="font-display font-extrabold text-display-xl text-white mb-5 leading-tight tracking-tight headline-twotone">
              <RevealText
                segments={[
                  "Apply once.",
                  " ",
                  <span className="accent" key="acc">
                    Hear back in 48 hours.
                  </span>,
                ]}
                stagger={0.08}
                trigger="view"
                amount={0.4}
              />
            </h3>
            <p className="text-body-md text-white/60 max-w-xl mx-auto mb-10 leading-relaxed">
              Free to start. No card. Every application runs on a public
              clock, and if the recruiter misses it, your slot comes back
              automatically.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/signup?next=/student/jobs">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white font-semibold text-base px-7 h-12 shadow-[0_8px_24px_rgba(1,145,252,0.32),inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-brand-600 transition-colors active:scale-[0.99]"
                >
                  Start applying for free
                  <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/signup?role=recruiter">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-xl text-white font-semibold text-base px-7 h-12 border border-white/20 hover:bg-white/20 transition-colors active:scale-[0.99]"
                >
                  I&apos;m hiring
                  <ArrowRight size={16} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="border-t border-neutral-200 mt-10 pt-8 pb-8">
        <div className="mx-auto max-w-content px-4 grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Logo size="sm" />
            <p className="text-body-xs text-neutral-900 mt-3 max-w-xs leading-relaxed">
              India-first hiring platform with anti-ghosting SLAs and embedded
              skill bootcamps. Built in Pune. DPDP Act compliant.
            </p>
            <div className="flex gap-2 mt-4">
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
                href="https://www.instagram.com/unghost.in/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="unGhost on Instagram"
                className="social-icon grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-brand-500 hover:bg-brand-500 hover:text-white transition"
              >
                <Instagram size={14} />
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
              ["Find Jobs", "/signup?next=/student/jobs"],
              ["Bootcamps", "/bootcamps"],
              ["AI Coach", "/signup?next=/student/coach"],
              ["Pricing", "/upgrade"],
            ]}
          />
          <FootCol
            title="For Recruiters"
            links={[
              ["Post Job", "/signup?role=recruiter"],
              ["Database Search", "/signup?role=recruiter"],
              ["Sponsorship", "/recruiters"],
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
        <div className="mx-auto max-w-content px-4 mt-10 pt-6 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-body-xs text-neutral-900">
          <p>
            © {new Date().getFullYear()} unGhost Technologies Pvt Ltd · Pune,
            India
          </p>
          <p>Data residency: ap-south-1 · Made in Pune, India</p>
        </div>
      </footer>
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
          <p className="text-body-lg text-neutral-900 mt-3 leading-relaxed max-w-prose">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}


function JobsTierCard({
  name,
  price,
  cadence,
  perMonth,
  note,
  badge,
  features,
  cta,
  href,
  highlight,
}: {
  name: string;
  price: string;
  cadence: string;
  perMonth: string | null;
  note: string | null;
  badge: string | null;
  features: readonly string[];
  cta: string;
  href: string;
  highlight: boolean;
}) {
  return (
    <Card
      surface={highlight ? "glass-tinted" : "solid"}
      className={`${highlight ? "!p-7 !rounded-2xl" : "!p-7 !rounded-lg"} h-full flex flex-col ${highlight ? "shadow-[0_12px_32px_rgba(1,145,252,0.18)]" : ""}`}
    >
      {/* Fixed-height badge slot so titles/prices line up across all 3 cards. */}
      <div className="h-6 mb-3 flex items-center">
        {badge && (
          <Badge tone="success" className="pop-in">
            {badge}
          </Badge>
        )}
      </div>
      <p className="font-display font-bold text-neutral-900 text-lg">{name}</p>
      <div className="mt-2 mb-1 flex items-baseline gap-2">
        <span className="font-display font-extrabold text-4xl text-neutral-950 tnum">
          {price}
        </span>
        <span className="text-body-sm text-neutral-900">{cadence}</span>
      </div>
      {/* Per-month line makes the annual plan's value legible; reserves a
          fixed-height row so all three cards keep their prices aligned. */}
      <div className="h-5 mb-1">
        {perMonth && (
          <span className="text-body-sm font-medium text-neutral-900 tnum">
            {perMonth}
          </span>
        )}
      </div>
      <div className="h-5 mb-4">
        {note && (
          <span className="text-body-xs font-semibold text-brand-600">
            {note}
          </span>
        )}
      </div>
      <ul className="space-y-2.5 mb-7 text-body-sm text-neutral-700">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-brand-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      {/* mt-auto pins the CTA to the card bottom across uneven feature lists. */}
      <Link href={href} className="mt-auto block">
        <Button variant={highlight ? "primary" : "secondary"} size="md" fullWidth>
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
              className="text-body-xs text-neutral-900 hover:text-brand-500 transition"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
