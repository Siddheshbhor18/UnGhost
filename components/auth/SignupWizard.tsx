"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
  LayoutGroup,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  FileText,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User2,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/glass";
import { getCapturedRef, clearCapturedRef } from "@/components/attribution/RefCapture";
import { AuthShell } from "./AuthShell";
import { AuthInput } from "./AuthInput";
import { OAuthButtons } from "./OAuthButtons";
import {
  PasswordStrengthRing,
  scorePassword,
} from "./PasswordStrengthRing";
import { CheckboxConsent } from "./CheckboxConsent";
import { RolePicker, type Role } from "./RolePicker";
import type { AuthHeroPhase } from "./AuthHero";

/**
 * SignupWizard — two-step signup. Replaces the monolithic /signup form.
 *
 *   Step 1 — Who are you?
 *     • Role card picker (student / recruiter)
 *     • Name, Email, optional Phone (collected for outreach, never verified)
 *     • Continue button gated on name + valid email
 *
 *   Step 2 — Secure it
 *     • Password (with PasswordStrengthRing leading icon)
 *     • Three consent checkboxes (Terms + DPDP comms required, marketing optional)
 *     • Submit gated on password policy + required consents
 *
 * State is held locally — no URL routing between steps. Step indicator dots
 * animate via layoutId so the active fill morphs across positions instead of
 * cross-fading.
 *
 * POST payload to /api/auth/signup is unchanged from the previous monolith.
 */

const COUNTRIES = [
  { code: "+91", flag: "🇮🇳" },
  { code: "+1", flag: "🇺🇸" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+971", flag: "🇦🇪" },
];

const EASE_OUT_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const HREF_BY_ROLE_SIGNUP: Record<string, string> = {
  student: "/dashboard",
  recruiter: "/recruiter/command",
  instructor: "/instructor/today",
  admin: "/admin/today",
};

export function SignupWizard() {
  const router = useRouter();
  const reduced = useReducedMotion();
  const shake = useAnimationControls();
  const { data: sessionData, status: sessionStatus } = useSession();
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const r = (sessionData?.user as any)?.role as string | undefined;
    router.replace(r ? HREF_BY_ROLE_SIGNUP[r] ?? "/dashboard" : "/dashboard");
  }, [sessionStatus, sessionData, router]);

  // Step machine — 1 (who) → 2 (secure). We never go beyond 2; success
  // redirects to /verify-phone.
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 fields
  const [role, setRole] = useState<Role>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("+91");
  const [phone, setPhone] = useState("");

  // Step 2 fields
  const [password, setPassword] = useState("");
  const [acceptTos, setAcceptTos] = useState(false);
  const [acceptService, setAcceptService] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState<AuthHeroPhase>("idle");

  // Resume continuity: pull staged resume from sessionStorage (set by
  // MagicWidget on the landing page) and prefill name + display skills.
  const [stagedResume, setStagedResume] = useState<{
    fileName: string;
    parsed?: {
      alias?: string;
      contactEmail?: string;
      skills?: string[];
    };
  } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("unghost:staged_resume");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setStagedResume(parsed);
      // Auto-prefill name + email if available, only if user hasn't typed
      if (parsed?.parsed?.alias && !name) setName(parsed.parsed.alias);
      if (parsed?.parsed?.contactEmail && !email)
        setEmail(parsed.parsed.contactEmail);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismissResume() {
    setStagedResume(null);
    try {
      sessionStorage.removeItem("unghost:staged_resume");
    } catch {
      /* ignore */
    }
  }

  const pwScore = useMemo(() => scorePassword(password), [password]);
  const canContinueStep1 =
    name.trim().length >= 2 && /\S+@\S+\.\S+/.test(email);
  const canSubmit =
    canContinueStep1 &&
    pwScore.level >= 2 &&
    acceptTos &&
    acceptService &&
    !busy;

  async function shakeError() {
    if (reduced) return;
    await shake.start({
      x: [0, -6, 6, -4, 4, 0],
      transition: { duration: 0.32, ease: EASE_OUT_SOFT },
    });
  }

  function next() {
    setErr(null);
    if (!canContinueStep1) {
      void shakeError();
      return;
    }
    setStep(2);
  }

  function back() {
    setErr(null);
    setStep(1);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      void shakeError();
      return;
    }
    setBusy(true);
    setErr(null);
    setPhase("submitting");
    try {
      // Phone is optional now (MSG91 retired). Send empty string if user
      // didn't fill — server's Zod schema accepts that and skips OTP.
      const phoneOut = phone.trim() ? `${country}${phone}` : "";
      // Channel-partner attribution — read the captured ?ref code from
      // localStorage. Server validates the code; bad codes go unattributed
      // but don't block signup.
      const referrerCode = getCapturedRef();
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phoneOut,
          password,
          role,
          acceptTos,
          acceptService,
          acceptMarketing,
          referrerCode,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        userId?: string;
        error?: string;
        message?: string;
      };

      if (!res.ok || !data.ok || !data.userId) {
        setPhase("idle");
        if (res.status === 429) {
          setErr("Too many signup attempts. Try again in a minute.");
        } else if (data.error === "email_taken" || data.error === "phone_taken") {
          setErr(data.message ?? "An account already uses these credentials.");
        } else if (data.error === "weak_password") {
          setErr(data.message ?? "Pick a stronger password.");
        } else {
          setErr(data.message ?? data.error ?? "Signup failed. Try again.");
        }
        void shakeError();
        return;
      }

      // Account exists. Clear the captured referrer so subsequent visitors
      // on this machine aren't accidentally attributed to the same partner.
      clearCapturedRef();
      // Play the hero "entering" beat briefly so the door choreography
      // reads, then route to /login. MSG91/verify-phone retired.
      setPhase("entering");
      setTimeout(
        () => {
          router.push("/login?just_signed_up=1");
          router.refresh();
        },
        reduced ? 0 : 600,
      );
    } catch (e) {
      setPhase("idle");
      setErr((e as Error).message);
      void shakeError();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell role={role} mode="signup" heroPhase={phase}>
      <motion.div animate={shake}>
        <div className="rounded-3xl">
          <GlassCard variant="strong" className="!p-6">
            {stagedResume ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE_OUT_SOFT }}
                className="relative mb-4 rounded-xl border border-brand-primary/20 bg-brand-primary/[0.06] p-3 pr-9"
              >
                <button
                  type="button"
                  onClick={dismissResume}
                  className="absolute top-2 right-2 grid place-items-center w-6 h-6 rounded-md text-brand-muted hover:text-brand-ink hover:bg-brand-ink/5 transition"
                  aria-label="Dismiss resume continuity"
                >
                  <X size={12} />
                </button>
                <div className="flex items-start gap-2.5">
                  <div className="shrink-0 grid place-items-center w-8 h-8 rounded-lg bg-brand-primary text-white">
                    <FileText size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-primary inline-flex items-center gap-1">
                      <Sparkles size={10} /> Continuing from your resume
                    </p>
                    <p className="text-sm font-semibold text-brand-ink truncate">
                      {stagedResume.fileName}
                    </p>
                    {stagedResume.parsed?.skills &&
                    stagedResume.parsed.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {stagedResume.parsed.skills.slice(0, 5).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand-primary/10 text-brand-primary font-semibold"
                          >
                            {s}
                          </span>
                        ))}
                        {stagedResume.parsed.skills.length > 5 ? (
                          <span className="text-[10px] text-brand-muted">
                            +{stagedResume.parsed.skills.length - 5} more
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </motion.div>
            ) : null}

            <div className="mb-4">
              <h1 className="font-display font-extrabold text-2xl text-brand-ink tracking-tight">
                {stagedResume ? "Finish setting up" : "Create your account"}
              </h1>
              <p className="text-sm text-brand-muted mt-0.5">
                {stagedResume
                  ? "We've prefilled what we could from your resume."
                  : "One email = one role. Career switchers need a new email."}
              </p>
            </div>

            <StepIndicator step={step} />

          {step === 1 ? (
            <StepOne
              key="step1"
              role={role}
              setRole={setRole}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              country={country}
              setCountry={setCountry}
              phone={phone}
              setPhone={setPhone}
              onNext={next}
              canContinue={canContinueStep1}
              reduced={!!reduced}
            />
          ) : (
            <StepTwo
              key="step2"
              password={password}
              setPassword={setPassword}
              acceptTos={acceptTos}
              setAcceptTos={setAcceptTos}
              acceptService={acceptService}
              setAcceptService={setAcceptService}
              acceptMarketing={acceptMarketing}
              setAcceptMarketing={setAcceptMarketing}
              onSubmit={submit}
              onBack={back}
              busy={busy}
              err={err}
              canSubmit={canSubmit}
              reduced={!!reduced}
            />
          )}

          {step === 1 ? (
            <>
              <div className="my-5 flex items-center gap-3">
                <span className="h-px bg-brand-ink/10 flex-1" />
                <span className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
                  or
                </span>
                <span className="h-px bg-brand-ink/10 flex-1" />
              </div>
              <OAuthButtons callbackUrl="/dashboard" onError={setErr} />
            </>
          ) : null}

          <p className="mt-6 text-center text-[11px] text-brand-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-brand-primary font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
          </GlassCard>
        </div>
      </motion.div>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step indicator — two dots; active one widens and fills, others stay small.
// `layoutId` on the active fill makes the transition feel continuous.
// ─────────────────────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <LayoutGroup>
      <div className="flex items-center gap-2 mb-5">
        {[1, 2].map((s) => {
          const active = step === s;
          return (
            <div
              key={s}
              className="relative h-1.5 rounded-full bg-brand-ink/10 overflow-hidden"
              style={{ width: active ? 28 : 12, transition: "width 0.3s ease" }}
            >
              {active ? (
                <motion.span
                  layoutId="step-fill"
                  className="absolute inset-0 bg-brand-primary rounded-full"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 30,
                  }}
                />
              ) : null}
            </div>
          );
        })}
        <span className="ml-2 text-[10px] uppercase tracking-wider font-semibold text-brand-muted">
          Step {step} of 2
        </span>
      </div>
    </LayoutGroup>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 1 — Role + identity
// ─────────────────────────────────────────────────────────────────────────
function StepOne(props: {
  role: Role;
  setRole: (r: Role) => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  onNext: () => void;
  canContinue: boolean;
  reduced: boolean;
}) {
  const {
    role,
    setRole,
    name,
    setName,
    email,
    setEmail,
    country,
    setCountry,
    phone,
    setPhone,
    onNext,
    canContinue,
    reduced,
  } = props;
  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: EASE_OUT_SOFT }}
      className="space-y-3"
    >
      <div>
        <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold mb-2">
          You are
        </p>
        <RolePicker value={role} onChange={setRole} variant="cards" />
      </div>

      <AuthInput
        label="Full name"
        leadingIcon={<User2 size={14} />}
        value={name}
        onValueChange={setName}
        autoComplete="name"
        validate={validateName}
        required
      />

      <AuthInput
        label="Email"
        type="email"
        leadingIcon={<Mail size={14} />}
        value={email}
        onValueChange={setEmail}
        autoComplete="email"
        validate={validateEmail}
        required
      />

      {/* Phone — country code dropdown + national number. Optional. */}
      <div>
        <div className="flex gap-2">
          <div className="relative">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="appearance-none rounded-xl border border-brand-ink/15 bg-white/60 backdrop-blur-md pl-3 pr-7 py-3.5 text-sm font-medium text-brand-ink hover:border-brand-ink/25 focus:outline-none focus:border-brand-primary focus:shadow-[0_0_0_4px_rgba(1,145,252,0.12)] transition"
              aria-label="Country code"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-brand-muted"
            />
          </div>
          <div className="flex-1">
            <AuthInput
              label="Phone (optional)"
              leadingIcon={<Phone size={14} />}
              value={phone}
              onValueChange={(v) => setPhone(v.replace(/[^0-9]/g, ""))}
              autoComplete="tel"
              tnum
              inputMode="numeric"
            />
          </div>
        </div>
        <p className="text-[10px] text-brand-muted mt-1.5 ml-1">
          We may reach out about your unGhost experience. Never verified, never sold.
        </p>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white shadow-brand-glow/40 transition mt-1"
      >
        Continue <ArrowRight size={14} />
      </button>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step 2 — Password + consents
// ─────────────────────────────────────────────────────────────────────────
function StepTwo(props: {
  password: string;
  setPassword: (v: string) => void;
  acceptTos: boolean;
  setAcceptTos: (v: boolean) => void;
  acceptService: boolean;
  setAcceptService: (v: boolean) => void;
  acceptMarketing: boolean;
  setAcceptMarketing: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  busy: boolean;
  err: string | null;
  canSubmit: boolean;
  reduced: boolean;
}) {
  const {
    password,
    setPassword,
    acceptTos,
    setAcceptTos,
    acceptService,
    setAcceptService,
    acceptMarketing,
    setAcceptMarketing,
    onSubmit,
    onBack,
    busy,
    err,
    canSubmit,
    reduced,
  } = props;
  const score = scorePassword(password);

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: EASE_OUT_SOFT }}
      className="space-y-3"
    >
      <AuthInput
        label="Password"
        type="password"
        leadingIcon={
          password ? <PasswordStrengthRing value={password} size={22} /> : <Lock size={14} />
        }
        value={password}
        onValueChange={setPassword}
        autoComplete="new-password"
        validate={validatePassword}
        required
      />
      {password ? (
        <p className="text-[11px] text-brand-muted -mt-1 ml-1">
          Strength: <span style={{ color: score.color }}>{score.label}</span>
        </p>
      ) : null}

      <div className="space-y-2 pt-2">
        <CheckboxConsent
          checked={acceptTos}
          onChange={setAcceptTos}
          required
          label={
            <>
              I agree to the{" "}
              <Link href="/terms" className="text-brand-primary underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-brand-primary underline">
                Privacy Policy
              </Link>
            </>
          }
        />
        <CheckboxConsent
          checked={acceptService}
          onChange={setAcceptService}
          required
          label="I consent to service communications (DPDP Act)"
        />
        <CheckboxConsent
          checked={acceptMarketing}
          onChange={setAcceptMarketing}
          label="Send me product updates (optional)"
        />
      </div>

      {err ? (
        <div
          role="alert"
          className="text-body-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
        >
          {err}
        </div>
      ) : null}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-brand-ink border border-brand-ink/10 hover:border-brand-ink/20 bg-white/40 hover:bg-white/60 transition"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white shadow-brand-glow/40 transition"
        >
          {busy ? (
            <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : (
            <>
              Create my account <ArrowRight size={14} />
            </>
          )}
        </button>
      </div>
    </motion.form>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Validators — kept inline so the wizard is self-contained.
// ─────────────────────────────────────────────────────────────────────────
function validateName(v: string) {
  if (v.trim().length < 2) return { ok: false, message: "Tell us your name." };
  return { ok: true };
}
function validateEmail(v: string) {
  if (!/\S+@\S+\.\S+/.test(v)) {
    return { ok: false, message: "That doesn't look like a valid email." };
  }
  return { ok: true };
}
function validatePassword(v: string) {
  const s = scorePassword(v);
  if (s.level < 2) {
    return { ok: false, message: "Add an uppercase, number, or longer length." };
  }
  return { ok: true };
}
