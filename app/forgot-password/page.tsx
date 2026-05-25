"use client";

// SMS-channel reset was removed when MSG91 was retired (mid-2026). The UI
// + the /api/otp route still exist for verify-phone signup compatibility
// but should NOT be advertised on forgot-password — no backend completes
// the reset over SMS, so showing the option would just lead to silent
// failure. Email-only via Resend now.
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassButton,
  GlassCard,
  GlassInput,
  Logo,
} from "@/components/glass";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [phase, setPhase] = useState<"input" | "sending" | "sent">("input");

  async function submit() {
    if (!identifier.trim() || phase === "sending") return;
    setPhase("sending");
    try {
      await fetch("/api/email/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: identifier.trim() }),
      });
    } catch {
      /* always show success to prevent enumeration */
    }
    setPhase("sent");
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <BlobField />
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>

        <GlassCard variant="strong" className="!p-7">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs text-brand-primary font-semibold mb-3"
          >
            <ArrowLeft size={12} /> Back to sign in
          </Link>

          {phase === "sent" ? (
            <div className="text-center py-4">
              <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-glass-lg mb-4">
                <CheckCircle2 size={28} />
              </div>
              <h1 className="font-display font-extrabold text-2xl text-brand-ink">
                Check your inbox
              </h1>
              <p className="text-sm text-brand-muted mt-3 leading-relaxed">
                If an account exists for{" "}
                <span className="font-mono font-semibold text-brand-ink">
                  {identifier}
                </span>
                , we sent a reset link. It expires in 1 hour and is
                single-use.
              </p>

              <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 inline-flex items-start gap-2 text-left">
                <Sparkles
                  size={13}
                  className="text-amber-700 mt-0.5 shrink-0"
                />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Email goes via Resend. If it doesn&apos;t arrive in 2 min,
                  check spam or try a different address.
                </p>
              </div>

              <p className="text-xs text-brand-muted mt-5">
                Didn&apos;t arrive?{" "}
                <button
                  onClick={() => setPhase("input")}
                  className="text-brand-primary font-semibold"
                >
                  Try a different email
                </button>
              </p>
            </div>
          ) : (
            <>
              <GlassBadge tone="brand">
                <Mail size={11} /> Reset password
              </GlassBadge>
              <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
                Locked out?
              </h1>
              <p className="text-sm text-brand-muted mt-2 leading-relaxed">
                Drop your email and we&apos;ll send you a single-use reset
                link.
              </p>

              <div className="mt-5">
                <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
                  Email address
                </label>
                <GlassInput
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@email.com"
                  autoFocus
                />
              </div>

              <GlassButton
                variant="brand"
                fullWidth
                onClick={submit}
                disabled={!identifier.trim() || phase === "sending"}
                className="mt-5"
              >
                {phase === "sending" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Mail size={14} /> Send reset link
                  </>
                )}
              </GlassButton>

              <p className="text-[11px] text-brand-muted text-center mt-5">
                Remember it?{" "}
                <Link
                  href="/login"
                  className="text-brand-primary font-semibold"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </GlassCard>
      </div>
    </main>
  );
}
