import Link from "next/link";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Clock,
  Mail,
  Shield,
  Sparkles,
  Target,
  Twitter,
  Linkedin,
  Upload,
  Video,
  Zap,
  Star,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import { GlassNavbar, Logo } from "@/components/glass";
import {
  Badge,
  BackdropMesh,
  Button,
  Card,
  SectionLabel,
  Stat,
} from "@/components/ui";
import { FAQ } from "@/components/landing/FAQ";
import { CookieConsent } from "@/components/landing/CookieConsent";
import { LiveSessionsTeaser } from "@/components/live/LiveSessionsTeaser";
import {
  listJobs,
  listCompanies,
  listBootcamps,
  getGlobalMetrics,
} from "@/server/store";

// Public landing data is session-independent (same jobs/companies/metrics/
// bootcamps for every anonymous visitor) so we cache it for 60 s across
// requests. The session lookup + dashboard redirect below still runs
// per-request — only the read-only data is shared.
const getLandingData = unstable_cache(
  async () => {
    const [allJobs, companies, metrics, bcs] = await Promise.all([
      listJobs(),
      listCompanies(),
      getGlobalMetrics(),
      listBootcamps(),
    ]);
    return { allJobs, companies, metrics, bcs };
  },
  ["landing-data-v1"],
  { revalidate: 60, tags: ["landing"] },
);

export default async function LandingPage() {
  // PRD: logged-in users auto-redirect to their dashboard
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "student") redirect("/dashboard");
  if (session?.user?.role === "recruiter") redirect("/recruiter/command");
  if (session?.user?.role === "admin") redirect("/admin/today");
  if (session?.user?.role === "instructor") redirect("/instructor/today");

  const { allJobs, companies, metrics, bcs } = await getLandingData();
  const jobs = allJobs.slice(0, 4);
  const featuredBootcamps = bcs.slice(0, 6);

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip" }}>
      <BackdropMesh />
      <GlassNavbar />
      <CookieConsent />

      {/* ─────────── HERO ─────────── */}
      <section className="mx-auto max-w-content px-4 pt-12 md:pt-20 pb-20">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="font-display font-extrabold tracking-tightest text-5xl md:text-7xl text-neutral-950 leading-[1.02] headline-twotone">
              We don&apos;t ghost.
              <br />
              <span className="accent">We unGhost.</span>
            </h1>
            <p className="text-body-lg text-neutral-500 max-w-xl leading-relaxed">
              India&apos;s first hiring platform where HR actually responds. Every
              recruiter commits to a public SLA. Miss it, your application is refunded.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/signup">
                <Button variant="primary" size="lg" trailingIcon={<ArrowRight size={16} />}>
                  Find a job
                </Button>
              </Link>
              <Link href="/signup?role=recruiter">
                <Button
                  variant="secondary"
                  size="lg"
                  leadingIcon={<Briefcase size={16} />}
                >
                  Hire without ghosting
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-5 pt-5 text-body-sm text-neutral-500">
              <span className="inline-flex items-center gap-2">
                <Shield size={14} className="text-brand-500" /> SLA-bound recruiters
              </span>
              <span className="inline-flex items-center gap-2">
                <Target size={14} className="text-brand-500" /> AI-matched missions
              </span>
              <span className="inline-flex items-center gap-2">
                <Video size={14} className="text-brand-500" /> Live + recorded bootcamps
              </span>
            </div>
          </div>

          {/* Metrics Column */}
          <div className="lg:col-span-5">
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Active missions"
                value={metrics.activeMissions}
                tone="brand"
                icon={<Target size={14} />}
              />
              <Stat
                label="Reply rate"
                value={`${100 - metrics.ghostingRatePct}%`}
                tone="success"
                icon={<Shield size={14} />}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── LIVE SESSIONS TEASER ─────────── */}
      {/* Self-hides when nothing to show. Picks one of 4 states based on
          the next-upcoming or currently-live free session in Mongo. */}
      <LiveSessionsTeaser />

      {/* ─────────── HOW IT WORKS ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <SectionHeader
          eyebrow="How it works"
          title="Drop, match, prove, hear back."
          subtitle="Four steps from resume to real reply."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          <StepCard
            num="01"
            icon={<Upload size={20} />}
            title="Drop your resume"
            copy="AI parses skills, history, impact in seconds. Edit, confirm, set your trajectory."
          />
          <StepCard
            num="02"
            icon={<Target size={20} />}
            title="Get matched"
            copy="Vector search ranks jobs against your skills, experience, trajectory. Tier A → D."
          />
          <StepCard
            num="03"
            icon={<Zap size={20} />}
            title="Prove your fit"
            copy="Take a real scenario per role. AI grades depth, integrity, evidence."
          />
          <StepCard
            num="04"
            icon={<CheckCircle2 size={20} />}
            title="Hear back — guaranteed"
            copy="Recruiters reply in 24/48/72 hours or your application credit is refunded."
          />
        </div>
      </section>

      {/* ─────────── THE PROBLEM (Stat moment, neutral/950 backdrop) ─── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <div className="rounded-3xl bg-neutral-950 text-white px-8 py-16 md:py-20 text-center relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(800px 400px at 50% 0%, rgba(220,38,38,0.25), transparent 60%)",
            }}
          />
          <div className="relative">
            <SectionLabel className="!text-error mb-5 justify-center">
              <TrendingDown size={12} /> The Problem
            </SectionLabel>
            <p className="font-display font-extrabold text-7xl md:text-9xl text-white leading-none mb-6 tnum tracking-tightest">
              75%
            </p>
            <h2 className="font-display font-bold text-display-lg text-white max-w-3xl mx-auto mb-4 tracking-tight">
              of job applications in India never receive a response.
            </h2>
            <p className="text-body-md text-white/70 max-w-2xl mx-auto leading-relaxed">
              Candidates apply into a void. Recruiters drown in noise. Naukri, LinkedIn,
              Indeed optimise for volume — not response. The market lacks accountability.
              unGhost rebuilds the marketplace around three innovations: per-stage SLAs,
              AI-graded fit, and bootcamp-backed verification.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── FOR STUDENTS / FOR RECRUITERS ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <SectionHeader
          eyebrow="Two sides, one promise"
          title="No ghost. Either direction."
        />
        <div className="grid md:grid-cols-2 gap-5 mt-10">
          <Card interactive className="!p-8">
            <Badge tone="info" className="mb-4">For Students</Badge>
            <h3 className="font-display font-bold text-display-md text-neutral-900 tracking-tight mb-3">
              Stop applying into a void.
            </h3>
            <ul className="space-y-2.5 text-body-sm text-neutral-700 mb-6">
              {[
                "AI-matched jobs, not keyword spam",
                "Free credit refund if a recruiter ghosts",
                "AI Career Coach with cross-session memory",
                "Bootcamps with Verified Skill badges",
                "Top-10 leaderboard featured to recruiters",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
            <Link href="/signup">
              <Button variant="primary" size="md" trailingIcon={<ArrowRight size={14} />}>
                Get started free
              </Button>
            </Link>
          </Card>

          <Card interactive className="!p-8">
            <Badge tone="success" className="mb-4">For Recruiters</Badge>
            <h3 className="font-display font-bold text-display-md text-neutral-900 tracking-tight mb-3">
              Hire pre-qualified candidates.
            </h3>
            <ul className="space-y-2.5 text-body-sm text-neutral-700 mb-6">
              {[
                "Tier A–D candidates ranked by AI relevancy",
                "Custom pipelines with per-stage SLAs",
                "AI-generated 30-question assessment banks",
                "Anonymised candidate database with bias controls",
                "Bootcamp sponsorship — close gaps on demand",
                "Free forever for posting and hiring",
              ].map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
            <Link href="/signup?role=recruiter">
              <Button variant="primary" size="md" trailingIcon={<ArrowRight size={14} />}>
                Post your first job free
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* ─────────── BOOTCAMPS PREVIEW ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <SectionHeader
          eyebrow="Bootcamps"
          title="Close the gap before you apply."
          subtitle="2 modules + 1 live session + a graded assignment. Verified Skill badge on completion."
          action={
            <Link
              href="/bootcamps"
              className="text-brand-500 font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all"
            >
              All bootcamps <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {featuredBootcamps.map((b) => (
            <Card key={b.id} interactive className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge tone="info">{b.skill}</Badge>
                <span className="inline-flex items-center gap-1 text-body-xs font-semibold text-warning">
                  <Star size={12} fill="currentColor" /> {b.rating}
                </span>
              </div>
              <div>
                <h3 className="font-display font-bold text-body-md text-neutral-900 line-clamp-1">
                  {b.title}
                </h3>
                <p className="text-body-sm text-neutral-500 line-clamp-2 mt-1">
                  {b.description}
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
                <span className="text-body-xs text-neutral-500">
                  {b.durationWeeks}w · {b.videos.length} videos
                </span>
                <span className="text-body-xs font-semibold text-violet-700 inline-flex items-center gap-1">
                  ✦ Premium
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ─────────── LIVE MISSIONS ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <SectionHeader
          eyebrow="Live missions"
          title="Roles answering this week."
          action={
            <Link
              href="/signup"
              className="text-brand-500 font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all"
            >
              See all <ArrowRight size={14} />
            </Link>
          }
        />
        <div className="grid md:grid-cols-2 gap-5 mt-10">
          {jobs.map((job) => {
            const co = companies.find((c) => c.id === job.companyId);
            const slaTone =
              job.slaHours <= 24 ? "error" : job.slaHours <= 48 ? "warning" : "info";
            return (
              <Card key={job.id} interactive>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Badge tone="neutral" leadingIcon={<Briefcase size={10} />} className="mb-2">
                      {co?.name ?? "—"}
                    </Badge>
                    <h3 className="font-display font-bold text-lg text-neutral-900 mb-1 truncate">
                      {job.title}
                    </h3>
                    <p className="text-body-sm text-neutral-500 mb-3">
                      {job.location} · {job.remote} · ₹{job.salaryMin}–{job.salaryMax} LPA
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="text-body-xs px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Badge tone={slaTone} leadingIcon={<Clock size={10} />}>
                    {job.slaHours}h SLA
                  </Badge>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ─────────── SOCIAL PROOF ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <SectionHeader
          eyebrow="Trusted by recruiters across India"
          title="Companies that answer the call."
        />
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {companies.slice(0, 8).map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <Card interactive className="!p-5 text-center h-full">
                <p className="font-display font-bold text-lg text-neutral-900">
                  {c.name}
                </p>
                <p className="section-label mt-1">{c.domain}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ─────────── PRICING SNAPSHOT ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <SectionHeader
          eyebrow="Pricing"
          title="Try 2 free. Upgrade once. Hire forever."
          subtitle="Recruiters: free forever. Students: 3 subscription tiers."
        />
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          <PriceCard
            tier="Free"
            price="₹0"
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
          <PriceCard
            tier="Pro"
            price="₹999"
            sub="per month"
            features={[
              "5 applications / month",
              "AI Coach (30-day rolling)",
              "Q&A with recruiters",
              "Cancel anytime",
            ]}
            cta="Go Pro"
            href="/upgrade?to=pro"
            highlight
          />
          <PriceCard
            tier="Premium"
            price="₹4,999"
            sub="one-time · lifetime"
            features={[
              "Unlimited applications",
              "AI Coach + Q&A forever",
              "Every bootcamp included",
              "Priority refund queue",
            ]}
            cta="Go Premium"
            href="/upgrade?to=premium"
          />
        </div>
        <p className="text-center text-body-xs text-neutral-500 mt-6">
          GST 18% inclusive · All sales final · UPI / Card / NetBanking via PhonePe
        </p>
      </section>

      {/* ─────────── FAQ ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <SectionHeader eyebrow="FAQ" title="The honest questions." />
        <div className="mt-10">
          <FAQ />
        </div>
      </section>

      {/* ─────────── FINAL CTA (signature glass-tinted hero) ─── */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <Card surface="glass-tinted" className="!py-14 !px-8 text-center !rounded-3xl">
          <SectionLabel tone="brand" className="mb-5 justify-center">
            The promise
          </SectionLabel>
          <h3 className="font-display font-extrabold text-display-xl text-neutral-950 mb-5 leading-tight tracking-tightest headline-twotone">
            No ghost. <span className="accent">No catch.</span>
          </h3>
          <p className="text-body-md text-neutral-500 max-w-xl mx-auto mb-8 leading-relaxed">
            Recruiters who don&apos;t reply in time lose visibility. Students who skip the
            gauntlet don&apos;t get reviewed. Symmetry, built in.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup">
              <Button variant="primary" size="lg" trailingIcon={<ArrowRight size={16} />}>
                I&apos;m looking
              </Button>
            </Link>
            <Link href="/signup?role=recruiter">
              <Button variant="secondary" size="lg" trailingIcon={<ArrowRight size={16} />}>
                I&apos;m hiring
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="border-t border-neutral-200 mt-10 pt-12 pb-8">
        <div className="mx-auto max-w-content px-4 grid grid-cols-2 md:grid-cols-6 gap-8">
          <div className="col-span-2">
            <Logo size="sm" />
            <p className="text-body-xs text-neutral-500 mt-3 max-w-xs leading-relaxed">
              India-first hiring platform with anti-ghosting SLAs and embedded skill
              bootcamps. Built in Mumbai. DPDP Act compliant.
            </p>
            <div className="flex gap-2 mt-4">
              <a
                href="https://twitter.com"
                className="grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-brand-500 hover:bg-brand-500 hover:text-white transition"
              >
                <Twitter size={14} />
              </a>
              <a
                href="https://linkedin.com"
                className="grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-brand-500 hover:bg-brand-500 hover:text-white transition"
              >
                <Linkedin size={14} />
              </a>
              <a
                href="mailto:hello@unghost.com"
                className="grid place-items-center w-8 h-8 rounded-lg bg-neutral-100 text-brand-500 hover:bg-brand-500 hover:text-white transition"
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
          <p>© {new Date().getFullYear()} unGhost Technologies Pvt Ltd · Mumbai, India</p>
          <p>
            Data residency: ap-south-1 · Made with{" "}
            <img src="/symbol.svg" alt="unGhost" width={12} height={12} className="inline align-text-bottom" /> in India
          </p>
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
  eyebrow: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap">
      <div className="max-w-2xl">
        <SectionLabel tone="brand" className="mb-2">
          {eyebrow}
        </SectionLabel>
        <h2 className="font-display font-extrabold text-display-lg text-neutral-950 tracking-tighter">
          {title}
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

function StepCard({
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
    <Card>
      <div className="flex items-center justify-between mb-4">
        <span
          className="grid place-items-center w-11 h-11 rounded-xl text-white"
          style={{
            background: "linear-gradient(135deg, #0191FC 0%, #3454DA 100%)",
            boxShadow: "0 8px 20px rgba(1,145,252,0.30)",
          }}
        >
          {icon}
        </span>
        <span className="font-display font-extrabold text-3xl text-neutral-200 tnum">
          {num}
        </span>
      </div>
      <h4 className="font-display font-bold text-lg text-neutral-900 mb-1">{title}</h4>
      <p className="text-body-sm text-neutral-500 leading-relaxed">{copy}</p>
    </Card>
  );
}

function PriceCard({
  tier,
  price,
  sub,
  features,
  cta,
  href,
  highlight,
}: {
  tier: string;
  price: string;
  sub: string;
  features: string[];
  cta: string;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Card
      selected={highlight}
      className={`!p-8 ${highlight ? "shadow-elev-4" : ""}`}
    >
      {highlight && (
        <Badge tone="info" className="mb-3">Most popular</Badge>
      )}
      <p className="font-display font-bold text-neutral-900 text-lg">{tier}</p>
      <div className="flex items-baseline gap-2 mt-2 mb-1">
        <span className="font-display font-extrabold text-4xl text-neutral-950 tnum">
          {price}
        </span>
        <span className="text-body-sm text-neutral-500">{sub}</span>
      </div>
      <ul className="space-y-2 my-6 text-body-sm text-neutral-700">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <CheckCircle2 size={14} className="text-brand-500 mt-0.5 shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Link href={href}>
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
