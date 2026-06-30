import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Filter,
  Layers,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { authOptions } from "@/server/auth";
import { GlassNavbar, Logo } from "@/components/glass";
import {
  Badge,
  Button,
  Card,
  SectionLabel,
  TierBadge,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * `/recruiters` — dedicated marketing landing for the recruiter side of the
 * platform. Lives alongside the student-facing `/` landing because the asks
 * are mirror-images: students want a job + signal, recruiters want a hire +
 * filter, and conflating both into one page muddies both pitches.
 *
 * The page redirects every authenticated user (regardless of role) back to
 * their dashboard — recruiters who are already in shouldn't see a sales
 * surface, and students/admins should never accidentally land here.
 *
 * Section order mirrors `/`: hero → SLA value → how-it-works → tier filter →
 * pricing → final CTA. The pricing block is a single "Free forever" pane
 * (recruiters pay nothing today) rather than a tier grid, so we don't
 * over-promise paid features that don't exist yet.
 */
export default async function RecruitersLanding() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "recruiter") redirect("/recruiter/command");
  if (session?.user?.role === "student") redirect("/dashboard");
  if (session?.user?.role === "admin") redirect("/admin/today");
  if (session?.user?.role === "instructor") redirect("/instructor/today");

  return (
    <main className="relative min-h-screen" style={{ overflowX: "clip" }}>
      <GlassNavbar />

      {/* ─────────── HERO ─────────── */}
      <section className="mx-auto max-w-content px-4 pt-12 md:pt-20 pb-12 relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(16,185,129,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.07) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage:
              "radial-gradient(ellipse 60% 50% at 50% 30%, black 30%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 60% 50% at 50% 30%, black 30%, transparent 70%)",
          }}
        />

        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <SectionLabel tone="success">For Recruiters</SectionLabel>
            <h1 className="font-display font-extrabold tracking-tightest text-5xl md:text-6xl text-neutral-950 leading-[1.05]">
              Hire pre-qualified candidates. <br />
              <span className="text-success">Without ghosting.</span>
            </h1>
            <p className="text-body-lg text-neutral-500 max-w-xl leading-relaxed">
              Every candidate ranked Tier A–D by AI. Every role goes live with
              a public 24/48/72-hour reply window. Free forever for posting
              and hiring.
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="flex items-center gap-1.5">
                <TierBadge tier="A" />
                <TierBadge tier="B" />
                <TierBadge tier="C" />
                <TierBadge tier="D" />
              </span>
              <ArrowRight size={16} className="text-success shrink-0" aria-hidden />
              <span className="text-body-sm text-neutral-600">
                AI-graded fit, never a made-up match percentage.
              </span>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/signup?role=recruiter">
                <Button
                  variant="primary"
                  size="lg"
                  trailingIcon={<ArrowRight size={16} />}
                >
                  Post your first role free
                </Button>
              </Link>
              <Link href="/login?role=recruiter">
                <Button variant="secondary" size="lg">
                  Recruiter sign in
                </Button>
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <HeroStatPanel />
          </div>
        </div>
      </section>

      {/* ─────────── SLA PROMISE ─────────── */}
      <section className="bg-neutral-950 text-white rounded-t-[32px] md:rounded-t-[40px] shadow-[0_0_80px_rgba(0,0,0,0.18)]">
        <div className="mx-auto max-w-content px-4 py-20 md:py-24 text-center">
          <Badge tone="success" className="mb-5 bg-success/15 ring-success/30 text-success">
            <Clock3 size={11} /> SLA-bound hiring
          </Badge>
          <h2 className="font-display font-extrabold text-display-xl md:text-5xl text-white max-w-3xl mx-auto mb-5 tracking-tightest leading-[1.08]">
            You set the window. <br className="hidden sm:block" />
            The platform holds you to it.
          </h2>
          <p className="text-body-md text-white/70 max-w-2xl mx-auto leading-relaxed">
            Pick 24h, 48h, or 72h per role before it goes live. Miss the
            window and the candidate&apos;s slot is returned automatically;
            the role drops in visibility until you clear the queue. No
            polling, no shame loops — just symmetry that ships hires faster.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {["24h", "48h", "72h"].map((h) => (
              <span
                key={h}
                className="tnum font-display font-bold text-2xl text-white rounded-2xl bg-white/5 ring-1 ring-white/15 px-6 py-3"
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── VALUE PROPS ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <SectionHeader
          eyebrow="Built for hiring"
          title="Filter, qualify, hire — all in one surface."
          subtitle="Replace the dozen tools recruiters tape together with one pipeline that grades, ranks, and ships."
        />
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          <ValueCard
            icon={<Filter size={20} />}
            title="Tier-ranked candidates"
            copy="A through D, graded by AI on skills, evidence, and trajectory. Filter by tier, not by keyword spam."
          />
          <ValueCard
            icon={<ClipboardCheck size={20} />}
            title="AI assessment banks"
            copy="One click generates 30 scenario questions per role. Tier A candidates ship a real artefact, not a multiple-choice quiz."
          />
          <ValueCard
            icon={<Layers size={20} />}
            title="Custom pipelines"
            copy="Per-stage SLAs, templates, rubrics, and team handoffs. Your hiring loop, your rules."
          />
          <ValueCard
            icon={<ShieldCheck size={20} />}
            title="Bias-controlled database"
            copy="Anonymise name, photo, school, and gender on demand. Search a deep India-first candidate pool with DPDP-clean controls."
          />
        </div>
      </section>

      {/* ─────────── HOW IT WORKS ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <SectionHeader
          eyebrow="How it works"
          title="From job spec to signed offer in days, not weeks."
        />
        <div className="relative mt-14">
          <div
            aria-hidden
            className="hidden lg:block absolute left-0 right-0 top-7 h-px bg-gradient-to-r from-transparent via-success/40 to-transparent"
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
            <FlowStep
              num="01"
              icon={<Zap size={18} />}
              title="Post in 90 seconds"
              copy="Paste a job spec. AI extracts skills, seniority, and salary band. Pick your SLA window before publishing."
            />
            <FlowStep
              num="02"
              icon={<Target size={18} />}
              title="Watch the queue rank"
              copy="Every applicant is tier-graded against your spec. Tier A surfaces at the top with their actual scenario response."
            />
            <FlowStep
              num="03"
              icon={<Users size={18} />}
              title="Run the loop your way"
              copy="Build custom stages, message in-platform, run assessments. Templates and rubrics save the team's time."
            />
            <FlowStep
              num="04"
              icon={<CheckCircle2 size={18} />}
              title="Hire — or release the slot"
              copy="Move to offer in a click. Miss the SLA on any candidate and their slot returns automatically. No ghosting, ever."
            />
          </div>
        </div>
      </section>

      {/* ─────────── PRICING — single emphatic block ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-success/10 via-white to-emerald-50 ring-1 ring-success/20 p-8 md:p-14 text-center shadow-[0_30px_80px_-30px_rgba(16,185,129,0.4)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-success/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl"
          />
          <div className="relative">
            <Badge tone="success" className="mb-5">
              <Sparkles size={11} /> Free forever for recruiters
            </Badge>
            <h2 className="font-display font-extrabold text-display-xl md:text-5xl text-neutral-950 tracking-tightest leading-tight mb-5">
              ₹0 to post. ₹0 to hire.
            </h2>
            <p className="text-body-md text-neutral-600 max-w-2xl mx-auto leading-relaxed mb-8">
              Unlimited job posts, unlimited messages, unlimited database
              searches. We make money on bootcamp sponsorships and student
              plans — never on hiring fees.
            </p>
            <ul className="mt-2 mb-8 grid sm:grid-cols-3 gap-3 max-w-3xl mx-auto text-left">
              {[
                "Unlimited active roles",
                "Unlimited applicant chats",
                "Unlimited database queries",
                "Custom pipelines & rubrics",
                "AI assessment generation",
                "Anti-ghost SLAs included",
              ].map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-body-sm text-neutral-700"
                >
                  <CheckCircle2
                    size={16}
                    className="text-success mt-0.5 shrink-0"
                  />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/signup?role=recruiter">
                <Button
                  variant="primary"
                  size="lg"
                  trailingIcon={<ArrowRight size={16} />}
                >
                  Post your first role free
                </Button>
              </Link>
              <Link href="/login?role=recruiter">
                <Button variant="secondary" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-body-xs text-neutral-500">
              Bootcamp sponsorships are priced separately and only billed when
              you sponsor a specific student. No subscription, no surprises.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────── FAQ — recruiter-specific ─────────── */}
      <section className="mx-auto max-w-content px-4 py-20">
        <SectionHeader title="Recruiter FAQ" />
        <div className="mt-10 max-w-3xl mx-auto space-y-3">
          {[
            {
              q: "How is this different from LinkedIn or Naukri?",
              a: "Two real differences. First, every applicant is AI-tiered against your spec, with a real scenario response attached — not just a resume keyword match. Second, the SLA is enforced for both sides: you commit to a reply window before the role goes live, and we hold you to it. No ghosting in either direction.",
            },
            {
              q: "Is it really free? Where's the catch?",
              a: "Free to post, free to hire, free to message — no per-role fees, no per-seat licensing. We earn on student-side bootcamp sponsorships and Jobs plans. Hiring will stay free for recruiters at launch and through 2026.",
            },
            {
              q: "What if I miss the SLA?",
              a: "The candidate's application slot returns automatically — it doesn't count against their cap, and they're free to apply elsewhere. Your role's visibility drops until you process the queue. Repeated misses lower your recruiter trust score, which gates the database.",
            },
            {
              q: "Can I anonymise candidate profiles?",
              a: "Yes. Name, photo, school, and gender can be hidden per recruiter, per pipeline, or per stage. The data is still there for compliance and the offer letter; it just isn't shown to the reviewers until you choose to reveal.",
            },
            {
              q: "What about sponsoring a bootcamp seat for a candidate?",
              a: "From any candidate profile you can sponsor a course (or the Everything bundle). They get a 3-month access grant, you get visibility into their skill-verify badge once they complete the gauntlet. Billed only when the candidate accepts.",
            },
          ].map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl bg-white ring-1 ring-neutral-200/80 overflow-hidden transition hover:ring-neutral-300"
            >
              <summary className="cursor-pointer list-none px-5 py-4 flex items-start justify-between gap-3 text-body-md font-semibold text-neutral-900">
                <span>{item.q}</span>
                <span className="shrink-0 mt-0.5 text-neutral-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-body-sm text-neutral-600 leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ─────────── FINAL CTA ─────────── */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <Card
          surface="glass-tinted"
          className="!py-14 !px-8 text-center !rounded-2xl relative overflow-hidden"
        >
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(16,185,129,0.12) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 ring-1 ring-success/30 text-success px-3 py-1 text-body-xs font-bold mb-5">
              <CheckCircle2 size={13} /> 90 seconds to your first role
            </span>
            <h3 className="font-display font-extrabold text-display-xl text-neutral-950 mb-5 leading-tight tracking-tightest">
              Stop sourcing. Start hiring.
            </h3>
            <p className="text-body-md text-neutral-500 max-w-xl mx-auto mb-8 leading-relaxed">
              Post your first role in under two minutes. The first tiered
              applicants land in your dashboard the same day.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/signup?role=recruiter">
                <Button
                  variant="primary"
                  size="lg"
                  trailingIcon={<ArrowRight size={16} />}
                >
                  Post your first role free
                </Button>
              </Link>
              <Link href="/login?role=recruiter">
                <Button variant="secondary" size="lg">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>

      {/* ─────────── FOOTER ─────────── */}
      <footer className="border-t border-neutral-200 mt-10 pt-12 pb-8">
        <div className="mx-auto max-w-content px-4 flex flex-wrap items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-body-xs text-neutral-500">
            © {new Date().getFullYear()} unGhost Technologies Pvt Ltd — built
            for hiring teams that ship.
          </p>
          <div className="flex flex-wrap gap-4 text-body-xs">
            <Link
              href="/"
              className="text-neutral-500 hover:text-brand-primary transition"
            >
              For students
            </Link>
            <Link
              href="/privacy"
              className="text-neutral-500 hover:text-brand-primary transition"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-neutral-500 hover:text-brand-primary transition"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ─── Local section primitives ──────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? (
        <SectionLabel tone="success" className="mb-2">
          {eyebrow}
        </SectionLabel>
      ) : null}
      <h2 className="font-display font-extrabold text-display-md md:text-display-xl text-neutral-950 tracking-tightest leading-[1.08]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-3 text-body-md text-neutral-500 leading-relaxed">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function ValueCard({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="group relative flex h-full flex-col rounded-2xl bg-white p-6 ring-1 ring-neutral-200/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_-26px_rgba(16,185,129,0.45)] hover:ring-success/30">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-success/10 text-success ring-1 ring-success/20">
        {icon}
      </span>
      <h3 className="mt-4 font-display text-lg font-bold tracking-tight text-neutral-950">
        {title}
      </h3>
      <p className="mt-2 text-body-sm text-neutral-500 leading-relaxed">
        {copy}
      </p>
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
      <div className="flex items-center gap-3 mb-3">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white ring-1 ring-success/20 text-success shadow-[0_8px_22px_-10px_rgba(16,185,129,0.45)] relative z-10">
          {icon}
        </span>
        <span className="font-display font-extrabold text-3xl tnum text-neutral-200 tracking-tight">
          {num}
        </span>
      </div>
      <h3 className="font-display font-bold text-lg text-neutral-950 mb-1.5 tracking-tight">
        {title}
      </h3>
      <p className="text-body-sm text-neutral-500 leading-relaxed">{copy}</p>
    </div>
  );
}

function HeroStatPanel() {
  return (
    <div className="relative rounded-3xl bg-white p-6 ring-1 ring-success/15 shadow-[0_24px_60px_-28px_rgba(16,185,129,0.4)]">
      <div className="flex items-center justify-between mb-5">
        <Badge tone="success">Pipeline preview</Badge>
        <span className="text-body-xs text-neutral-400 tnum">2 / 12 hrs left</span>
      </div>
      <div className="space-y-2.5">
        {[
          { tier: "A" as const, name: "Priya M.", role: "GTM Engineer", evidence: "Built outbound system, 31 demos / mo" },
          { tier: "A" as const, name: "Ravi K.", role: "GTM Engineer", evidence: "Owned RevOps at Series-B SaaS" },
          { tier: "B" as const, name: "Anika S.", role: "GTM Engineer", evidence: "Inbound playbook + RevOps cert" },
          { tier: "C" as const, name: "Vikram D.", role: "GTM Engineer", evidence: "2 yrs SDR experience" },
        ].map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-3 rounded-xl bg-neutral-50 p-3 ring-1 ring-neutral-200/60"
          >
            <TierBadge tier={c.tier} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-neutral-900">
                {c.name} <span className="text-neutral-400 font-normal">· {c.role}</span>
              </p>
              <p className="text-[11.5px] text-neutral-500 truncate">{c.evidence}</p>
            </div>
            <ArrowRight size={14} className="text-neutral-400 shrink-0" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-center text-neutral-400">
        Sample preview — real candidates appear once your role is live.
      </p>
    </div>
  );
}
