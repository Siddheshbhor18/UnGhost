import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  Logo,
} from "@/components/glass";

interface Props {
  params: { token: string };
}

export default function VerifyEmailPage({ params }: Props) {
  // Phase 1: any non-empty token "verifies". Real impl: GET /api/auth/verify-email/[token]
  // → look up Redis verify:email:token, mark user.emailVerified=true.
  const valid = params.token.length > 6;

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <BlobField />
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>

        <GlassCard variant="strong" className="!p-8 text-center">
          {valid ? (
            <>
              <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-glass-lg mb-4">
                <CheckCircle2 size={28} />
              </div>
              <GlassBadge tone="success">
                <Mail size={11} /> Email verified
              </GlassBadge>
              <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
                You&apos;re all set.
              </h1>
              <p className="text-sm text-brand-muted mt-3 leading-relaxed">
                Your email address has been confirmed. Welcome to unGhost — open
                the dashboard to drop your resume and start matching.
              </p>
              <Link
                href="/dashboard"
                className="btn-brand mt-6 inline-flex"
              >
                Open dashboard <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-rose-500 text-white shadow-glass-lg mb-4">
                <Mail size={28} />
              </div>
              <GlassBadge tone="danger">Link invalid</GlassBadge>
              <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
                This link expired
              </h1>
              <p className="text-sm text-brand-muted mt-3 leading-relaxed">
                Verification links are good for 24 hours. Request a fresh one
                from the dashboard.
              </p>
              <Link
                href="/login"
                className="btn-brand mt-6 inline-flex"
              >
                Sign in
              </Link>
            </>
          )}

          <p className="text-[11px] text-brand-muted mt-6">
            Issues?{" "}
            <a
              href="mailto:support@unghost.com"
              className="text-brand-primary underline"
            >
              support@unghost.com
            </a>
          </p>
        </GlassCard>
      </div>
    </main>
  );
}
