"use client";

/**
 * /forgot-password
 *
 * Email-only reset flow (SMS was retired with MSG91). Two phases:
 *
 *   input → user types email, hits send. We POST to /api/email/forgot-password
 *           which always returns 200 to prevent email enumeration.
 *   sent  → success state. Shows generic "if an account exists..." copy.
 *
 * Uses the same AuthShell + AuthInput design system as /login and /signup
 * so the ghost+door scene + role-tinted gradient stay consistent.
 */

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"input" | "sending" | "sent">("input");

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!email.trim() || phase === "sending") return;
    setPhase("sending");
    try {
      await fetch("/api/email/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {
      /* always show success to prevent enumeration */
    }
    setPhase("sent");
  }

  return (
    <AuthShell role="student" mode="signin">
      <div className="rounded-3xl">
        <div className="relative rounded-3xl border border-white/60 bg-white/80 backdrop-blur-2xl shadow-elev-3 p-6 md:p-7">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs text-brand-primary font-semibold mb-3 hover:underline"
          >
            <ArrowLeft size={12} /> Back to sign in
          </Link>

          {phase === "sent" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-center py-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [0, 1.15, 1], rotate: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-lg mb-4"
                style={{ boxShadow: "0 12px 28px rgba(14,159,110,0.4)" }}
              >
                <CheckCircle2 size={28} />
              </motion.div>
              <h1 className="font-display font-extrabold text-2xl text-neutral-900">
                Check your inbox
              </h1>
              <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
                If an account exists for{" "}
                <span className="font-mono font-semibold text-neutral-900">
                  {email}
                </span>
                , we sent a reset link. It expires in 1 hour and is single-use.
              </p>

              <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 inline-flex items-start gap-2 text-left">
                <Sparkles size={13} className="text-amber-700 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Email goes via Resend. If it doesn&apos;t arrive in 2 min,
                  check spam or try a different address.
                </p>
              </div>

              <p className="text-xs text-neutral-500 mt-5">
                Didn&apos;t arrive?{" "}
                <button
                  onClick={() => {
                    setPhase("input");
                    setEmail("");
                  }}
                  className="text-brand-primary font-semibold hover:underline"
                >
                  Try a different email
                </button>
              </p>
            </motion.div>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-brand-primary font-semibold">
                <Mail size={11} /> Reset password
              </span>
              <h1 className="font-display font-extrabold text-2xl text-neutral-900 mt-2">
                Locked out?
              </h1>
              <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
                Drop your email and we&apos;ll send you a single-use reset
                link.
              </p>

              <form onSubmit={submit} className="mt-5 space-y-3">
                <AuthInput
                  label="Email"
                  type="email"
                  autoComplete="email"
                  leadingIcon={<Mail size={14} />}
                  value={email}
                  onValueChange={setEmail}
                  validate={validateEmail}
                  required
                />

                <button
                  type="submit"
                  disabled={!email.trim() || phase === "sending"}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition"
                >
                  {phase === "sending" ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send reset link <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>

              <p className="text-[11px] text-neutral-500 text-center mt-5">
                Remember it?{" "}
                <Link
                  href="/login"
                  className="text-brand-primary font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  );
}

function validateEmail(v: string) {
  if (!/\S+@\S+\.\S+/.test(v)) {
    return { ok: false, message: "That doesn't look like a valid email." };
  }
  return { ok: true };
}
