import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  Heart,
} from "lucide-react";
import { Suspense } from "react";
import { GlassNavbar } from "@/components/glass";
import {
  Badge,
  Button,
  Card,
  SectionLabel,
} from "@/components/ui";
import { HeroDemoLoop } from "@/components/landing/HeroDemoLoop";
import { LiquidGlass } from "@/components/ui/LiquidGlass";
import { BootcampCardStack } from "@/components/landing/BootcampCardStack";
import { HeroCTAs } from "@/components/landing/HeroCTAs";
import { VoidSection } from "@/components/landing/VoidSection";
import { SpeakerSpotlight } from "@/components/landing/SpeakerSpotlight";
import { HeroReveal } from "@/components/landing/HeroReveal";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { StickyCTA } from "@/components/landing/StickyCTA";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { LaneShowcase } from "@/components/landing/LaneShowcase";
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
  MagneticCard,
  ParallaxBackdrop,
  ScrollProgress,
} from "@/components/landing/motion";

import { CoursesSection } from "@/components/landing/CoursesSection";
import { formatPaiseAsINR } from "@/shared/lib/pricing";
import {
  COURSE_PRICE_PAISE,
  EVERYTHING_BUNDLE_PAISE,
} from "@/shared/lib/courses";
import { PLAN_PRICING, type CompanyProfile, type Job } from "@/shared/types";
import { listCompanies, listJobs } from "@/server/store";

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
    // The page's promise is "free to start" — the activation CTA gets the
    // filled button even though the card itself isn't the highlighted tier.
    ctaVariant: "primary",
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

  // Real board signal for the void section (both reads Redis-cached 60s): the
  // companies with roles live on the clock. A failed read degrades to no
  // marquee — never invented data.
  const [liveJobs, liveCompanies] = await Promise.all([
    listJobs().catch((): Job[] => []),
    listCompanies().catch((): CompanyProfile[] => []),
  ]);
  const activeJobs = liveJobs.filter((j) => j.active);
  const companyNameById = new Map(liveCompanies.map((c) => [c.id, c.name]));
  const hiringCompanies = [...new Set(activeJobs.map((j) => j.companyId))]
    .map((id) => companyNameById.get(id))
    .filter((name): name is string => Boolean(name))
    .slice(0, 14);

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
              className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-2.5 pt-5 text-body-sm text-neutral-600 sm:grid-cols-2"
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
              <LiquidGlass>
                <HeroDemoLoop />
              </LiquidGlass>
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
            <LiquidGlass>
              <HeroDemoLoop />
            </LiquidGlass>
          </MotionSection>
        </div>
        
      </section>
      </HeroReveal>

      {/* ─────────── LIVE SESSIONS TEASER ─────────── */}
      <MotionSection amount={0.3} className="relative z-[1] py-16 md:py-24">
        <LiveSessionsTeaser />
      </MotionSection>

      {/* ─────────── THE VOID — dark beat, staged: the withheld silence, the
          key light that blooms with the turn, the ghost looming in the dark
          half, and a marquee of companies hiring on the clock. ─────────── */}
      <VoidSection hiringCompanies={hiringCompanies} />
      </div>

      {/* ─────────── TWO LANES — alternating editorial rows: copy and visual
          enter from opposite sides; media slots are designed placeholders
          awaiting final imagery (see LaneShowcase doc comment). ─────────── */}
      <LaneShowcase />

      {/* ─────────── GUEST SESSIONS — "talk to the biggest names": recorded
          Abhinav Ranka session as proof. Keeps id=featured-speaker so the
          WhatsApp share deep-link still lands here. ─────────── */}
      <MotionSection
        id="featured-speaker"
        className="mx-auto max-w-content px-4 py-16 md:py-24 scroll-mt-24"
        amount={0.15}
      >
        <SpeakerSpotlight />
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
        className="mx-auto max-w-content px-4 pt-24 md:pt-32 pb-16 md:pb-24"
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

      {/* ─────────── FINAL CTA — THE BLUE DRENCH ───────────
          The one Committed-color moment on the page: the closing promise sits
          on brand blue itself (gradient biased dark for AA body contrast),
          with the house dot-grid texture and a ghosted symbol watermark.
          Buttons carry the magnetic hover the hero deliberately refuses. */}
      <MotionSection
        className="mx-auto max-w-5xl px-4 py-16 md:py-28"
        amount={0.2}
        y={32}
      >
        <div
          className="relative rounded-[32px] md:rounded-[40px] text-white shadow-[0_32px_90px_-24px_rgba(1,86,158,0.55)] overflow-hidden"
          style={{
            backgroundImage:
              "linear-gradient(135deg,#014E99 0%,#0166C8 50%,#0186EC 100%)",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/symbol.svg"
            alt=""
            aria-hidden
            className="pointer-events-none absolute -bottom-16 -right-8 w-56 rotate-[-8deg] opacity-[0.09] select-none"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <div className="relative px-8 md:px-12 py-16 md:py-20 text-center">
            <h3 className="font-display font-extrabold text-display-xl text-white/70 mb-5 leading-tight tracking-tight">
              <RevealText
                segments={[
                  "Apply once.",
                  " ",
                  <span className="text-white" key="acc">
                    Hear back in 48 hours.
                  </span>,
                ]}
                stagger={0.08}
                trigger="view"
                amount={0.4}
              />
            </h3>
            <p className="text-body-md text-white/90 max-w-xl mx-auto mb-10 leading-relaxed">
              Free to start. No card. Every application runs on a public
              clock, and if the recruiter misses it, your slot comes back
              automatically.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <MagneticCard className="inline-block" strength={8} scale={1.02}>
                <Link href="/signup?next=/student/jobs">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-white text-brand-700 font-semibold text-base px-7 h-12 shadow-[0_10px_30px_rgba(1,40,80,0.35)] hover:bg-brand-50 transition-colors active:scale-[0.99]"
                  >
                    Start applying for free
                    <ArrowRight size={16} />
                  </button>
                </Link>
              </MagneticCard>
              <MagneticCard className="inline-block" strength={8} scale={1.02}>
                <Link href="/signup?role=recruiter">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-xl text-white font-semibold text-base px-7 h-12 border border-white/25 hover:bg-white/20 transition-colors active:scale-[0.99]"
                  >
                    I&apos;m hiring
                    <ArrowRight size={16} />
                  </button>
                </Link>
              </MagneticCard>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* ─────────── FOOTER ─────────── */}
      <SiteFooter />
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
  ctaVariant,
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
  /** Overrides the highlight-driven button style (e.g. Free tier primary). */
  ctaVariant?: "primary" | "secondary";
}) {
  return (
    <Card
      surface={highlight ? "glass-tinted" : "solid"}
      className={`${highlight ? "!p-7 !rounded-2xl" : "!p-7 !rounded-lg"} h-full flex flex-col ${highlight ? "shadow-[0_12px_32px_rgba(1,145,252,0.18)]" : ""}`}
    >
      {/* Fixed-height badge slot so titles/prices line up across all 3 cards.
          Alignment only matters when the cards sit side-by-side (md+), so
          empty slots collapse on mobile instead of reading as dead space. */}
      <div className={badge ? "h-6 mb-3 flex items-center" : "hidden md:flex h-6 mb-3 items-center"}>
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
      <div className={perMonth ? "h-5 mb-1" : "hidden md:block h-5 mb-1"}>
        {perMonth && (
          <span className="text-body-sm font-medium text-neutral-900 tnum">
            {perMonth}
          </span>
        )}
      </div>
      <div className={note ? "h-5 mb-4" : "hidden md:block h-5 mb-4"}>
        {note && (
          <span className="text-body-xs font-semibold text-brand-600">
            {note}
          </span>
        )}
      </div>
      <ul className="mt-3 md:mt-0 space-y-2.5 mb-7 text-body-sm text-neutral-700">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 size={15} className="text-brand-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      {/* mt-auto pins the CTA to the card bottom across uneven feature lists. */}
      <Link href={href} className="mt-auto block">
        <Button
          variant={ctaVariant ?? (highlight ? "primary" : "secondary")}
          size="md"
          fullWidth
        >
          {cta}
        </Button>
      </Link>
    </Card>
  );
}

