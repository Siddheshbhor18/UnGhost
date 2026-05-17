"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import clsx from "clsx";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  ChevronDown,
  Mail,
  Phone,
  User2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/glass";
import {
  Badge,
  BackdropMesh,
  Button,
  Card,
  Input,
} from "@/components/ui";

type Role = "student" | "recruiter";

function passwordStrength(p: string): {
  level: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
} {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  const map: Record<number, { label: string; color: string }> = {
    0: { label: "Too short", color: "bg-error" },
    1: { label: "Weak", color: "bg-error" },
    2: { label: "Okay", color: "bg-warning" },
    3: { label: "Good", color: "bg-success" },
    4: { label: "Strong", color: "bg-success" },
  };
  return { level: score as 0 | 1 | 2 | 3 | 4, ...map[score] };
}

function SignupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = (params.get("role") as Role) || "student";
  const fromResume = params.get("from") === "resume";

  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("+91");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTos, setAcceptTos] = useState(false);
  const [acceptService, setAcceptService] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pw = useMemo(() => passwordStrength(password), [password]);

  const canSubmit =
    name.length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    phone.length >= 7 &&
    pw.level >= 2 &&
    acceptTos &&
    acceptService;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErr(null);
    // Phase 1: stub auto-login as demo user matching role.
    // Real impl: POST /api/auth/signup → OTP → onboarding.
    const demoEmail = role === "recruiter" ? "hr@stark.test" : "alice@demo.test";
    const res = await signIn("credentials", {
      email: demoEmail,
      password: "demo",
      redirect: false,
    });
    setBusy(false);
    if (res?.error) {
      setErr("Signup is in demo mode — sign in with a demo account instead.");
      return;
    }
    router.push(role === "recruiter" ? "/recruiter/command" : "/onboarding");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <BackdropMesh />
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>

        <Card padded className="!p-7">
          {fromResume && (
            <div className="mb-5 rounded-md bg-success-light border border-success/20 px-4 py-3 text-body-sm text-success">
              <strong className="font-semibold">Resume staged.</strong> Finish signup to
              see matched missions.
            </div>
          )}

          <h1 className="font-display font-extrabold text-display-md text-neutral-950 tracking-tight mb-1">
            Create your account
          </h1>
          <p className="text-body-sm text-neutral-500 mb-5">
            One email = one role. Career switchers need a new email.
          </p>

          {/* Role split */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-neutral-100 mb-5">
            <RolePill
              active={role === "student"}
              icon={<User2 size={14} />}
              label="Find a job"
              onClick={() => setRole("student")}
            />
            <RolePill
              active={role === "recruiter"}
              icon={<Briefcase size={14} />}
              label="Hire talent"
              onClick={() => setRole("recruiter")}
            />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <FieldRow label="Full name" icon={<User2 size={14} />}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aniket Sharma"
                required
                minLength={2}
              />
            </FieldRow>

            <FieldRow label="Email" icon={<Mail size={14} />}>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                required
              />
            </FieldRow>

            <FieldRow label="Phone" icon={<Phone size={14} />}>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="input appearance-none pr-8 w-20"
                  >
                    <option value="+91">+91</option>
                    <option value="+1">+1</option>
                    <option value="+44">+44</option>
                    <option value="+971">+971</option>
                  </select>
                  <ChevronDown
                    size={12}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                  />
                </div>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="9876543210"
                  required
                />
              </div>
              <p className="text-body-xs text-neutral-500 mt-1">
                We&apos;ll send an OTP. Required regardless of OAuth.
              </p>
            </FieldRow>

            <FieldRow label="Password" icon={<Lock size={14} />}>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                minLength={8}
              />
              {password.length > 0 && (
                <div className="mt-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={clsx(
                          "h-1 rounded-full flex-1",
                          i <= pw.level ? pw.color : "bg-neutral-200",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-body-xs text-neutral-500 mt-1">{pw.label}</p>
                </div>
              )}
            </FieldRow>

            <div className="space-y-2 pt-2">
              <Consent
                checked={acceptTos}
                onChange={setAcceptTos}
                required
                label={
                  <>
                    I agree to the{" "}
                    <Link href="/terms" className="text-brand-500 underline">
                      Terms
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-brand-500 underline">
                      Privacy Policy
                    </Link>
                  </>
                }
              />
              <Consent
                checked={acceptService}
                onChange={setAcceptService}
                required
                label="I consent to service communications (DPDP Act)"
              />
              <Consent
                checked={acceptMarketing}
                onChange={setAcceptMarketing}
                label="Send me product updates (optional)"
              />
            </div>

            {err && (
              <div
                role="alert"
                className="text-body-sm text-error bg-error-light border border-error/20 rounded-md px-3 py-2"
              >
                {err}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={!canSubmit}
              loading={busy}
              trailingIcon={!busy ? <ArrowRight size={14} /> : undefined}
            >
              {busy ? "Creating account…" : "Create my account"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-neutral-200 flex-1" />
            <span className="section-label">or</span>
            <div className="h-px bg-neutral-200 flex-1" />
          </div>

          <div className="space-y-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() =>
                signIn("google", { callbackUrl: "/onboarding" }).catch(() =>
                  setErr("Google OAuth not configured. Use credentials demo."),
                )
              }
            >
              Continue with Google
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() =>
                signIn("linkedin", { callbackUrl: "/onboarding" }).catch(() =>
                  setErr("LinkedIn OAuth not configured."),
                )
              }
            >
              Continue with LinkedIn
            </Button>
          </div>

          <p className="mt-6 text-center text-body-xs text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-500 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </Card>

        <div className="mt-4 text-center">
          <Badge tone="neutral" leadingIcon={<ShieldCheck size={10} />}>
            Data residency: Mumbai · DPDP compliant
          </Badge>
        </div>
      </div>
    </main>
  );
}

function RolePill({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-body-sm font-semibold transition",
        active
          ? "bg-neutral-0 shadow-elev-1 text-neutral-900"
          : "text-neutral-500 hover:text-neutral-900",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function FieldRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-body-sm font-medium text-neutral-700 mb-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function Consent({
  checked,
  onChange,
  label,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-neutral-300 accent-brand-500"
      />
      <span className="text-body-xs text-neutral-700 leading-relaxed">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </span>
    </label>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <SignupInner />
    </Suspense>
  );
}
