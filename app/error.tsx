"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RotateCw } from "lucide-react";
import { BlobField, GlassBadge, GlassCard } from "@/components/glass";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Real impl: ship to Sentry / Better Stack
    console.error("[unGhost] App error:", error);
  }, [error]);

  return (
    <main className="relative min-h-screen grid place-items-center px-4 py-12">
      <BlobField />

      <GlassCard variant="strong" className="!p-10 text-center max-w-lg w-full">
        <div className="mx-auto grid place-items-center w-20 h-20 rounded-3xl bg-rose-500 text-white shadow-glass-lg mb-5">
          <AlertTriangle size={36} />
        </div>

        <GlassBadge tone="danger">500 · Something broke</GlassBadge>

        <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-3">
          Our ghost tripped.
        </h1>

        <p className="text-sm text-brand-muted mt-3 leading-relaxed">
          We logged the error and the team will look at it. Try again — usually
          a refresh fixes the moment.
        </p>

        {error.digest && (
          <p className="text-[10px] uppercase tracking-wider text-brand-muted font-mono mt-5 bg-rose-500/5 border border-rose-500/20 rounded-xl px-3 py-2 inline-block">
            Trace ID · {error.digest}
          </p>
        )}

        <div className="flex flex-wrap justify-center gap-2 mt-7">
          <button onClick={() => reset()} className="btn-brand">
            <RotateCw size={14} /> Try again
          </button>
          <Link href="/" className="btn-glass">
            <ArrowLeft size={14} /> Back home
          </Link>
        </div>

        <p className="text-[10px] text-brand-muted mt-8">
          Persistent issues? Email{" "}
          <a
            href="mailto:support@unghost.com"
            className="text-brand-primary underline"
          >
            support@unghost.com
          </a>
        </p>
      </GlassCard>
    </main>
  );
}
