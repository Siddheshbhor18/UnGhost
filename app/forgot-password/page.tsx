"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
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

type Channel = "email" | "sms";

export default function ForgotPasswordPage() {
  const [channel, setChannel] = useState<Channel>("email");
  const [identifier, setIdentifier] = useState("");
  const [phase, setPhase] = useState<"input" | "sending" | "sent">("input");

  async function submit() {
    if (!identifier.trim() || phase === "sending") return;
    setPhase("sending");
    try {
      if (channel === "email") {
        await fetch("/api/email/forgot-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: identifier.trim() }),
        });
      } else {
        await fetch("/api/otp", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone: identifier.trim() }),
        });
      }
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
                Check your{" "}
                {channel === "email" ? "inbox" : "messages"}
              </h1>
              <p className="text-sm text-brand-muted mt-3 leading-relaxed">
                If an account exists for{" "}
                <span className="font-mono font-semibold text-brand-ink">
                  {identifier}
                </span>
                , we sent a reset{" "}
                {channel === "email" ? "link" : "code"}. Expires in 15 min.
              </p>

              <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 inline-flex items-start gap-2 text-left">
                <Sparkles
                  size={13}
                  className="text-amber-700 mt-0.5 shrink-0"
                />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>Demo mode:</strong>{" "}
                  {channel === "email"
                    ? "real impl sends via Resend"
                    : "real impl sends via MSG91"}{" "}
                  · the link/code is shown in the server console for now.
                </p>
              </div>

              <p className="text-xs text-brand-muted mt-5">
                Didn&apos;t arrive?{" "}
                <button
                  onClick={() => setPhase("input")}
                  className="text-brand-primary font-semibold"
                >
                  Try a different channel
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
                Choose how you want to reset. We&apos;ll send a one-time link
                or code, your call.
              </p>

              {/* Channel pills */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-brand-ink/5 mt-5">
                <button
                  onClick={() => setChannel("email")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    channel === "email"
                      ? "bg-white shadow-sm text-brand-ink"
                      : "text-brand-muted hover:text-brand-ink"
                  }`}
                >
                  <Mail size={13} /> Email link
                </button>
                <button
                  onClick={() => setChannel("sms")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    channel === "sms"
                      ? "bg-white shadow-sm text-brand-ink"
                      : "text-brand-muted hover:text-brand-ink"
                  }`}
                >
                  <MessageSquare size={13} /> SMS code
                </button>
              </div>

              <div className="mt-4">
                <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold block mb-1.5">
                  {channel === "email" ? "Email address" : "Phone number"}
                </label>
                <GlassInput
                  type={channel === "email" ? "email" : "tel"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    channel === "email"
                      ? "you@email.com"
                      : "+91 9876543210"
                  }
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
                ) : channel === "email" ? (
                  <>
                    <Mail size={14} /> Send reset link
                  </>
                ) : (
                  <>
                    <Phone size={14} /> Send reset code
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
