"use client";

/**
 * /reset-password/[token] — the page the forgot-password email links to.
 *
 * Three phases driven by the token verification:
 *   1. checking  — initial mount, verifying token via GET /api/auth/reset-password
 *   2. expired   — token invalid / expired / consumed → CTA back to forgot-password
 *   3. form      — token valid; new-password form
 *   On submit success → done state → soft redirect to /login
 *
 * Password policy mirrors `checkPasswordPolicy` in server/auth/password.ts:
 *   • 8+ chars (≤72 bytes)
 *   • 1 uppercase
 *   • 1 digit
 *
 * Uses AuthShell + AuthInput to match the new /login + /signup design.
 */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";

type Phase = "checking" | "expired" | "form" | "submitting" | "done";

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Verify token on mount (no-consume)
  useEffect(() => {
    let cancelled = false;
    async function check(): Promise<void> {
      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as { valid?: boolean };
        if (cancelled) return;
        setPhase(data.valid ? "form" : "expired");
      } catch {
        if (!cancelled) setPhase("expired");
      }
    }
    if (!token || token.length < 32) {
      setPhase("expired");
    } else {
      void check();
    }
    return () => {
      cancelled = true;
    };
  }, [token]);

  const policy = checkPolicy(password);
  const matches = password.length > 0 && password === confirm;
  const canSubmit = policy.ok && matches && phase === "form";

  async function submit(e?: React.FormEvent): Promise<void> {
    e?.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setPhase("submitting");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          reason?: string;
        };
        if (res.status === 410) {
          setPhase("expired");
          return;
        }
        throw new Error(
          data.reason ?? data.error ?? "Couldn't reset your password",
        );
      }
      setPhase("done");
      setTimeout(() => router.push("/login?reset=1"), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reset password");
      setPhase("form");
    }
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

          <AnimatePresence mode="wait">
            {phase === "checking" && <CheckingState key="checking" />}
            {phase === "expired" && <ExpiredState key="expired" />}
            {phase === "done" && <DoneState key="done" />}
            {(phase === "form" || phase === "submitting") && (
              <FormState
                key="form"
                password={password}
                confirm={confirm}
                showPw={showPw}
                error={error}
                policy={policy}
                matches={matches}
                canSubmit={canSubmit}
                submitting={phase === "submitting"}
                onPassword={setPassword}
                onConfirm={setConfirm}
                onToggleShow={() => setShowPw((s) => !s)}
                onSubmit={submit}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────

function CheckingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="text-center py-8"
    >
      <Loader2
        size={28}
        className="mx-auto animate-spin text-brand-primary mb-3"
      />
      <p className="text-sm text-neutral-500">Verifying your reset link…</p>
    </motion.div>
  );
}

function ExpiredState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="text-center py-4"
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: [0, 1.15, 1], rotate: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-rose-500/15 text-rose-600 mb-4"
        style={{ boxShadow: "0 12px 28px rgba(220,38,38,0.18)" }}
      >
        <AlertCircle size={28} />
      </motion.div>
      <h1 className="font-display font-extrabold text-2xl text-neutral-900">
        Link expired
      </h1>
      <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
        This reset link has expired or has already been used. Reset links are
        single-use and last 1 hour.
      </p>
      <Link
        href="/forgot-password"
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 px-4 py-3 text-sm font-semibold text-white transition"
      >
        Send a new reset link <ArrowRight size={14} />
      </Link>
    </motion.div>
  );
}

function DoneState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="text-center py-4"
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: [0, 1.15, 1], rotate: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-emerald-500 text-white mb-4"
        style={{ boxShadow: "0 12px 28px rgba(14,159,110,0.4)" }}
      >
        <CheckCircle2 size={28} />
      </motion.div>
      <h1 className="font-display font-extrabold text-2xl text-neutral-900">
        Password updated
      </h1>
      <p className="text-sm text-neutral-500 mt-3 leading-relaxed">
        You can sign in with your new password now.
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-neutral-500">
        <Loader2 size={12} className="animate-spin" /> Redirecting to sign in…
      </div>
    </motion.div>
  );
}

function FormState({
  password,
  confirm,
  showPw,
  error,
  policy,
  matches,
  canSubmit,
  submitting,
  onPassword,
  onConfirm,
  onToggleShow,
  onSubmit,
}: {
  password: string;
  confirm: string;
  showPw: boolean;
  error: string | null;
  policy: ReturnType<typeof checkPolicy>;
  matches: boolean;
  canSubmit: boolean;
  submitting: boolean;
  onPassword: (s: string) => void;
  onConfirm: (s: string) => void;
  onToggleShow: () => void;
  onSubmit: (e?: React.FormEvent) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-brand-primary font-semibold">
        <Lock size={11} /> Choose a new password
      </span>
      <h1 className="font-display font-extrabold text-2xl text-neutral-900 mt-2">
        Set a new password
      </h1>
      <p className="text-sm text-neutral-500 mt-2 leading-relaxed">
        Pick something you&apos;ll remember. The link is single-use, so finish
        this in one go.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <AuthInput
          label="New password"
          type={showPw ? "text" : "password"}
          value={password}
          onValueChange={onPassword}
          autoComplete="new-password"
          maxLength={72}
          leadingIcon={<Lock size={14} />}
          trailingNode={
            <button
              type="button"
              onClick={onToggleShow}
              className="grid place-items-center w-7 h-7 rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition"
              aria-label={showPw ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
          required
        />
        <AuthInput
          label="Confirm new password"
          type={showPw ? "text" : "password"}
          value={confirm}
          onValueChange={onConfirm}
          autoComplete="new-password"
          maxLength={72}
          leadingIcon={<Lock size={14} />}
          required
        />

        {/* Live policy checklist */}
        {password.length > 0 ? (
          <ul className="text-[11px] space-y-1 pl-1 pt-1">
            <PolicyRow ok={policy.length} label="8+ characters" />
            <PolicyRow ok={policy.upper} label="One uppercase letter" />
            <PolicyRow ok={policy.digit} label="One number" />
            {confirm.length > 0 ? (
              <PolicyRow ok={matches} label="Confirmation matches" />
            ) : null}
          </ul>
        ) : null}

        {error ? (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Updating…
            </>
          ) : (
            <>
              <Sparkles size={14} /> Update password
            </>
          )}
        </button>
      </form>

      <p className="text-[11px] text-neutral-500 text-center mt-5">
        Wrong account?{" "}
        <Link
          href="/forgot-password"
          className="text-brand-primary font-semibold hover:underline"
        >
          Start over
        </Link>
      </p>
    </motion.div>
  );
}

function PolicyRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`inline-flex items-center gap-1.5 ${
        ok ? "text-emerald-700" : "text-neutral-500"
      }`}
    >
      {ok ? (
        <CheckCircle2 size={11} className="text-emerald-600" />
      ) : (
        <span className="inline-block w-[11px] h-[11px] rounded-full border border-neutral-300" />
      )}
      <span>{label}</span>
    </li>
  );
}

// Mirrors server/auth/password.ts checkPasswordPolicy
function checkPolicy(password: string) {
  const length = password.length >= 8 && password.length <= 72;
  const upper = /[A-Z]/.test(password);
  const digit = /\d/.test(password);
  return { length, upper, digit, ok: length && upper && digit };
}
