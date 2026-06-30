import Link from "next/link";
import { ArrowLeft, Calendar, ShieldCheck } from "lucide-react";
import { BlobField, GlassBadge, GlassCard, GlassNavbar } from "@/components/glass";

interface Props {
  title: string;
  effectiveDate: string;
  badge?: string;
  intro?: string;
  children: React.ReactNode;
}

export function LegalShell({
  title,
  effectiveDate,
  badge,
  intro,
  children,
}: Props) {
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

        <GlassCard variant="strong" className="!p-7 mb-6">
          {badge && (
            <GlassBadge tone="brand">
              <ShieldCheck size={11} /> {badge}
            </GlassBadge>
          )}
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-3">
            {title}
          </h1>
          <p className="text-xs text-brand-muted mt-2 inline-flex items-center gap-1">
            <Calendar size={11} /> Effective {effectiveDate} ·{" "}
            unGhost Technologies Pvt Ltd · Pune, India
          </p>
          {intro && (
            <p className="text-sm text-brand-ink/85 mt-4 leading-relaxed">
              {intro}
            </p>
          )}
        </GlassCard>

        <article className="prose-legal space-y-5">{children}</article>

        <div className="mt-10 grid sm:grid-cols-4 gap-2">
          <FootLink href="/privacy" label="Privacy" />
          <FootLink href="/terms" label="Terms" />
          <FootLink href="/refund-policy" label="Refund" />
          <FootLink href="/dpdp" label="DPDP" />
        </div>

        <p className="text-[11px] text-brand-muted text-center mt-6">
          Questions?{" "}
          <a
            href="mailto:legal@unghost.com"
            className="text-brand-primary underline"
          >
            legal@unghost.com
          </a>{" "}
          · Data Protection Officer:{" "}
          <a
            href="mailto:dpo@unghost.com"
            className="text-brand-primary underline"
          >
            dpo@unghost.com
          </a>
        </p>
      </div>
    </main>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GlassCard>
      <h2 className="font-display font-bold text-xl text-brand-ink mb-3">
        {title}
      </h2>
      <div className="text-sm text-brand-ink/85 leading-relaxed space-y-3">
        {children}
      </div>
    </GlassCard>
  );
}

function FootLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-center text-xs font-semibold text-brand-primary bg-white/50 border border-white/60 rounded-xl py-2 hover:bg-white/80 transition"
    >
      {label}
    </Link>
  );
}
