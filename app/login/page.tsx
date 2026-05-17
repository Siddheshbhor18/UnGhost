"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck, User2, BookOpen } from "lucide-react";
import { DoorAnimation, Logo } from "@/components/glass";
import {
  Badge,
  BackdropMesh,
  Button,
  Card,
  Field,
  Input,
} from "@/components/ui";
import clsx from "clsx";

type Role = "student" | "recruiter" | "instructor" | "admin";

const ROLES: { id: Role; label: string; icon: React.ReactNode; demoEmail: string; href: string }[] = [
  { id: "student", label: "Student", icon: <User2 size={16} />, demoEmail: "alice@demo.test", href: "/dashboard" },
  { id: "recruiter", label: "Recruiter", icon: <ShieldCheck size={16} />, demoEmail: "hr@stark.test", href: "/recruiter/command" },
  { id: "instructor", label: "Instructor", icon: <BookOpen size={16} />, demoEmail: "cristian@instructor.test", href: "/instructor/today" },
  { id: "admin", label: "Admin", icon: <GraduationCap size={16} />, demoEmail: "root@noghost.test", href: "/admin/today" },
];

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("alice@demo.test");
  const [password, setPassword] = useState("demo");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [playDoor, setPlayDoor] = useState(false);
  const [dest, setDest] = useState<string>("/");

  function switchRole(r: Role) {
    setRole(r);
    setErr(null);
    setEmail(ROLES.find((x) => x.id === r)!.demoEmail);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setErr("Wrong credentials. Try the demo email above with password 'demo'.");
      return;
    }
    const target = nextParam ?? ROLES.find((x) => x.id === role)!.href;
    setDest(target);
    setPlayDoor(true);
  }

  const active = ROLES.find((r) => r.id === role)!;

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 py-10">
      <BackdropMesh />
      <DoorAnimation
        active={playDoor}
        studentName={role === "student" ? "Alice" : undefined}
        onComplete={() => {
          router.push(dest);
          router.refresh();
        }}
      />
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>

        <Card padded className="!p-7">
          {/* Role pills */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-neutral-100 mb-6">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => switchRole(r.id)}
                className={clsx(
                  "flex items-center justify-center gap-1.5 py-2 rounded-lg text-body-sm font-semibold transition",
                  role === r.id
                    ? "bg-neutral-0 shadow-elev-1 text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-900",
                )}
              >
                {r.icon}
                <span className="hidden sm:inline">{r.label}</span>
              </button>
            ))}
          </div>

          <h1 className="font-display font-extrabold text-display-md text-neutral-950 tracking-tight mb-1">
            Welcome back.
          </h1>
          <p className="text-body-sm text-neutral-500 mb-5">
            Signing in as{" "}
            <span className="font-semibold text-neutral-900">{active.label}</span>.
            Demo password:{" "}
            <span className="font-mono text-brand-500">demo</span>
          </p>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={active.demoEmail}
                autoComplete="email"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo"
                autoComplete="current-password"
              />
            </Field>
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
              loading={busy}
              trailingIcon={!busy ? <ArrowRight size={14} /> : undefined}
            >
              {busy ? "Signing in…" : "Sign in"}
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
                signIn("google", { callbackUrl: active.href }).catch(() =>
                  setErr("Google OAuth not configured. Use credentials."),
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
                signIn("linkedin", { callbackUrl: active.href }).catch(() =>
                  setErr("LinkedIn OAuth not configured."),
                )
              }
            >
              Continue with LinkedIn
            </Button>
          </div>

          <p className="mt-6 text-center text-body-xs text-neutral-500">
            New here?{" "}
            <Link href="/signup" className="text-brand-500 font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </Card>

        <div className="mt-4 text-center">
          <Badge tone="neutral">
            Demo accounts available · Switch role pill to try each side
          </Badge>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginInner />
    </Suspense>
  );
}
