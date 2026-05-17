import Link from "next/link";
import { Clock, Mail, Wrench } from "lucide-react";
import { BlobField, GlassBadge, GlassCard } from "@/components/glass";

export default function MaintenancePage() {
  return (
    <main className="relative min-h-screen grid place-items-center px-4 py-12">
      <BlobField />

      <GlassCard variant="strong" className="!p-10 text-center max-w-lg w-full">
        <div className="mx-auto grid place-items-center w-20 h-20 rounded-3xl bg-amber-500 text-white shadow-glass-lg mb-5">
          <Wrench size={36} />
        </div>

        <GlassBadge tone="warn">
          <Clock size={11} /> Maintenance window
        </GlassBadge>

        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-3">
          Ghost is on a break.
        </h1>

        <p className="text-sm text-brand-muted mt-3 leading-relaxed">
          We&apos;re shipping a fix. The SLA clock is paused for everyone — no
          one gets ghosted while we&apos;re ghosted. Back in a few minutes.
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <a
            href="https://status.unghost.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glass"
          >
            <Clock size={14} /> Status page
          </a>
          <a
            href="mailto:support@unghost.com"
            className="btn-glass"
          >
            <Mail size={14} /> Support
          </a>
        </div>

        <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mt-8">
          Mumbai · ap-south-1 · DPDP compliant
        </p>

        <Link
          href="/"
          className="text-xs text-brand-primary font-semibold mt-3 inline-block hover:underline"
        >
          Retry now →
        </Link>
      </GlassCard>
    </main>
  );
}
