"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassCard,
  Logo,
} from "@/components/glass";

interface Props {
  params: { token: string };
}

type Status = "loading" | "ok" | "expired" | "invalid" | "error";

/**
 * /verify-email/[token]
 *
 * Calls GET /api/auth/verify-email/[token] on mount. The token is one-shot,
 * so we deliberately do not re-call on re-mount (we accept "expired" as the
 * terminal state if the user double-clicks the link).
 */
export default function VerifyEmailPage({ params }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/verify-email/${params.token}`, {
          method: "POST",
        });
        const data = (await res.json()) as {
          ok?: boolean;
          email?: string;
          reason?: string;
        };
        if (cancelled) return;
        if (res.ok && data.ok) {
          setStatus("ok");
          setEmail(data.email ?? null);
        } else if (data.reason === "expired") {
          setStatus("expired");
        } else {
          setStatus("invalid");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

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
          {status === "loading" ? (
            <>
              <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-neutral-200 text-neutral-700 mb-4">
                <Loader2 className="animate-spin" size={28} />
              </div>
              <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
                Verifying…
              </h1>
            </>
          ) : status === "ok" ? (
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
                {email
                  ? `${email} is confirmed.`
                  : "Your email is confirmed."}{" "}
                Sign in to continue.
              </p>
              <Link href="/login" className="btn-brand mt-6 inline-flex">
                Sign in <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-rose-500 text-white shadow-glass-lg mb-4">
                <Mail size={28} />
              </div>
              <GlassBadge tone="danger">
                {status === "expired" ? "Link expired" : "Link invalid"}
              </GlassBadge>
              <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
                {status === "expired"
                  ? "This link expired"
                  : "Couldn't verify"}
              </h1>
              <p className="text-sm text-brand-muted mt-3 leading-relaxed">
                {status === "expired"
                  ? "Verification links are good for 24 hours. Request a fresh one from sign-in."
                  : "The link is missing or already used. Sign in and we'll send a new one."}
              </p>
              <Link href="/login" className="btn-brand mt-6 inline-flex">
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
