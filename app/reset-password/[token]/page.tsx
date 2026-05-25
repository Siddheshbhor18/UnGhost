"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
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

/**
 * /reset-password/[token] — the page the forgot-password email links to.
 *
 * Three phases, picked by what's known about the token + form state:
 *
 *   1. CHECKING  — initial mount, server is verifying the token via
 *                  GET /api/auth/reset-password?token=...
 *   2. EXPIRED   — token invalid / expired / already consumed
 *                  → message + CTA to start over at /forgot-password
 *   3. FORM      — token valid; render new-password form
 *                  → POST /api/auth/reset-password { token, password }
 *                  → on success, show "all set" toast + redirect to /login
 *
 * Password policy mirrors `checkPasswordPolicy` in server/auth/password.ts:
 *   • 8+ chars
 *   • 1 uppercase
 *   • 1 digit
 *   • ≤72 bytes (bcrypt limit)
 * We surface live policy checks below the field so the user knows what
 * they're missing before submit.
 */
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

  // Phase 1: verify the token on mount (no-consume).
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

  async function submit(): Promise<void> {
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
        // 410 means the token was consumed/expired between our peek and our POST.
        if (res.status === 410) {
          setPhase("expired");
          return;
        }
        throw new Error(
          data.reason ?? data.error ?? "Couldn't reset your password",
        );
      }
      setPhase("done");
      // Soft redirect after a beat so the user reads the success state.
      setTimeout(() => router.push("/login?reset=1"), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reset password");
      setPhase("form");
    }
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

          {phase === "checking" ? (
            <CheckingState />
          ) : phase === "expired" ? (
            <ExpiredState />
          ) : phase === "done" ? (
            <DoneState />
          ) : (
            <FormState
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
        </GlassCard>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Phase panels
// ─────────────────────────────────────────────────────────────────────────

function CheckingState() {
  return (
    <div className="text-center py-6">
      <Loader2
        size={28}
        className="mx-auto animate-spin text-brand-primary mb-3"
      />
      <p className="text-sm text-brand-muted">Verifying your reset link…</p>
    </div>
  );
}

function ExpiredState() {
  return (
    <div className="text-center py-4">
      <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-rose-500/15 text-rose-600 shadow-glass-lg mb-4">
        <AlertCircle size={28} />
      </div>
      <h1 className="font-display font-extrabold text-2xl text-brand-ink">
        Link expired
      </h1>
      <p className="text-sm text-brand-muted mt-3 leading-relaxed">
        This reset link has expired or has already been used. Reset links
        are single-use and last 1 hour.
      </p>
      <Link href="/forgot-password" className="block mt-5">
        <GlassButton variant="brand" fullWidth>
          Send a new reset link
        </GlassButton>
      </Link>
    </div>
  );
}

function DoneState() {
  return (
    <div className="text-center py-4">
      <div className="mx-auto grid place-items-center w-16 h-16 rounded-2xl bg-emerald-500 text-white shadow-glass-lg mb-4">
        <CheckCircle2 size={28} />
      </div>
      <h1 className="font-display font-extrabold text-2xl text-brand-ink">
        Password updated
      </h1>
      <p className="text-sm text-brand-muted mt-3 leading-relaxed">
        You can sign in with your new password now.
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-brand-muted">
        <Loader2 size={12} className="animate-spin" /> Redirecting to sign in…
      </div>
    </div>
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
  onSubmit: () => void;
}) {
  return (
    <>
      <GlassBadge tone="brand">
        <Lock size={11} /> Choose a new password
      </GlassBadge>
      <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
        Set a new password
      </h1>
      <p className="text-sm text-brand-muted mt-2 leading-relaxed">
        Pick something you&apos;ll remember. The link is single-use, so
        finish this in one go.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="mt-5 space-y-4"
      >
        <PasswordField
          label="New password"
          value={password}
          onChange={onPassword}
          show={showPw}
          onToggleShow={onToggleShow}
          autoFocus
        />
        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={onConfirm}
          show={showPw}
          onToggleShow={onToggleShow}
        />

        {/* Live policy checklist — quiet until the user starts typing */}
        {password.length > 0 ? (
          <ul className="text-[11px] space-y-1 pl-1">
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

        <GlassButton
          variant="brand"
          fullWidth
          type="submit"
          disabled={!canSubmit || submitting}
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
        </GlassButton>
      </form>

      <p className="text-[11px] text-brand-muted text-center mt-5">
        Wrong account?{" "}
        <Link
          href="/forgot-password"
          className="text-brand-primary font-semibold"
        >
          Start over
        </Link>
      </p>
    </>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold flex items-center justify-between mb-1.5">
        <span>{label}</span>
        <button
          type="button"
          onClick={onToggleShow}
          className="text-brand-primary font-semibold inline-flex items-center gap-1"
        >
          {show ? <EyeOff size={11} /> : <Eye size={11} />}
          {show ? "Hide" : "Show"}
        </button>
      </label>
      <GlassInput
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        autoFocus={autoFocus}
        autoComplete="new-password"
        maxLength={72}
      />
    </div>
  );
}

function PolicyRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`inline-flex items-center gap-1.5 ${
        ok ? "text-emerald-700" : "text-brand-muted"
      }`}
    >
      {ok ? (
        <CheckCircle2 size={11} className="text-emerald-600" />
      ) : (
        <span className="inline-block w-[11px] h-[11px] rounded-full border border-brand-muted/40" />
      )}
      <span>{label}</span>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
//  Client-side policy. Mirrors server/auth/password.ts checkPasswordPolicy
//  so the field can pre-flag failures, but the server is still the source
//  of truth — server re-validates on POST.
// ─────────────────────────────────────────────────────────────────────────
function checkPolicy(password: string) {
  const length = password.length >= 8 && password.length <= 72;
  const upper = /[A-Z]/.test(password);
  const digit = /\d/.test(password);
  return { length, upper, digit, ok: length && upper && digit };
}
