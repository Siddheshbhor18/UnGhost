import Link from "next/link";
import { ArrowLeft, Search, Sparkles } from "lucide-react";
import { BlobField, GlassBadge, GlassCard } from "@/components/glass";

export default function NotFound() {
  return (
    <main className="relative min-h-screen grid place-items-center px-4 py-12">
      <BlobField />

      <GlassCard variant="strong" className="!p-10 text-center max-w-lg w-full">
        <div className="mx-auto grid place-items-center w-20 h-20 rounded-3xl bg-brand-gradient shadow-brand-glow mb-5 ghost-idle">
          <img
            src="/symbol.svg"
            alt="unGhost"
            width={44}
            height={44}
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>

        <GlassBadge tone="brand">
          <Sparkles size={11} /> 404
        </GlassBadge>

        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-3">
          This ghost wandered off.
        </h1>

        <p className="text-sm text-brand-muted mt-3 leading-relaxed">
          The page you&apos;re looking for either moved, was deleted, or never
          existed. Don&apos;t worry: we don&apos;t ghost you when this
          happens.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mt-7">
          <Link href="/" className="btn-brand">
            <ArrowLeft size={14} /> Back home
          </Link>
          <Link href="/dashboard" className="btn-glass">
            <Search size={14} /> Open dashboard
          </Link>
        </div>

        <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mt-8">
          Error ID · 404 · ghost-not-found
        </p>
      </GlassCard>
    </main>
  );
}
