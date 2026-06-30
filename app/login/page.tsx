"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { signIn, signOut, getSession, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, Mail, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/glass";
// DoorAnimation is a STATIC import, not next/dynamic({ ssr: false }). Under
// Next 14's Turbopack, an ssr:false dynamic import of this module crashed the
// entire /login client render ("module factory is not available"). The
// component is SSR-safe (its only navigator access is guarded inside an
// effect) and returns null until `active`, so a plain import costs nothing
// at SSR or first paint and removes the crash in both dev and prod builds.
import { DoorAnimation } from "@/components/glass/DoorAnimation";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordField } from "@/components/auth/PasswordField";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { RolePicker, ROLE_PILLS, type Role } from "@/components/auth/RolePicker";
import type { AuthHeroPhase } from "@/components/auth/AuthHero";
import { safeNext } from "@/shared/lib/safe-redirect";

const HREF_BY_ROLE: Record<Role, string> = {
  student: "/dashboard",
  recruiter: "/recruiter/command",
  instructor: "/instructor/today",
  admin: "/admin/today",
};

/** Human-readable role names for the role-mismatch error message. */
const ROLE_LABEL: Record<Role, string> = {
  student: "Student",
  recruiter: "Recruiter",
  instructor: "Instructor",
  admin: "Admin",
};

const EASE_OUT_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Delay between hero "entering" phase start and the full-screen
 *  DoorAnimation overlay. Lets the hero ghost actually glide into the door
 *  before the larger door scene takes over. */
const HERO_TO_OVERLAY_MS = 550;

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const reduced = useReducedMotion();
  const shake = useAnimationControls();
  const nextParam = safeNext(params.get("next"));
  const { data: sessionData, status: sessionStatus } = useSession();
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const r = (sessionData?.user as any)?.role as Role | undefined;
    const dest = nextParam ?? (r ? HREF_BY_ROLE[r] : "/dashboard");
    router.replace(dest);
  }, [sessionStatus, sessionData, nextParam, router]);

  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<AuthHeroPhase>("idle");
  const [playDoor, setPlayDoor] = useState(false);
  const [dest, setDest] = useState<string>("/");
  const [doorName, setDoorName] = useState<string | undefined>();

  const demoForActiveRole = ROLE_PILLS.find((r) => r.id === role)?.demoEmail;
  const formRef = useRef<HTMLFormElement | null>(null);

  function switchRole(r: Role) {
    setRole(r);
    setErr(null);
    setEmail("");
  }

  // Update scene phase based on form interaction
  function handleFieldFocus() {
    if (phase === "idle" || phase === "error") setPhase("typing");
  }
  function handleFieldBlur() {
    if (phase === "typing") setPhase("idle");
  }

  async function shakeError() {
    if (reduced) return;
    await shake.start({
      x: [0, -6, 6, -4, 4, 0],
      transition: { duration: 0.32, ease: EASE_OUT_SOFT },
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setPhase("submitting");
    const res = await signIn("credentials", {
      email,
      password,
      // Selected role tab. The server (authorize) rejects the sign-in if it
      // doesn't match the account's real role — enforced BEFORE a session is
      // issued, so a role mismatch never mints a usable token.
      role,
      redirect: false,
    });
    if (res?.error) {
      setBusy(false);
      setPhase("error");
      // Auto-reset to idle after error animation plays
      setTimeout(() => setPhase("idle"), 1200);
      // Note: the old PHONE_UNVERIFIED branch was deleted along with the
      // MSG91 ripout — the server can no longer throw it. If we ever
      // reintroduce a verification gate, surface the error message via
      // the suspended/banned branch below (single-source for soft-block).
      if (
        res.error.toLowerCase().includes("suspended") ||
        res.error.toLowerCase().includes("banned") ||
        res.error.toLowerCase().includes("grace") ||
        res.error.toLowerCase().includes("attempt") ||
        res.error.toLowerCase().includes("selected role")
      ) {
        setErr(res.error);
      } else {
        setErr("Wrong credentials. Check the email + password you used at signup.");
      }
      void shakeError();
      return;
    }

    // Auth OK. Read the account's REAL role from the fresh session.
    const fresh = await getSession();
    const realRole = (fresh?.user as any)?.role as Role | undefined;

    // Enforce the role pill: the tab the visitor picked must match the
    // account they're signing into. A recruiter account signing in under the
    // "Student" tab (or vice-versa) is rejected — we sign the just-created
    // session back out and tell them which tab to use. This keeps the picker
    // honest instead of silently ignoring it.
    if (realRole && realRole !== role) {
      await signOut({ redirect: false });
      setBusy(false);
      setPhase("error");
      setTimeout(() => setPhase("idle"), 1200);
      setErr(
        `That's a ${ROLE_LABEL[realRole]} account. Switch to the ${ROLE_LABEL[realRole]} tab to sign in.`,
      );
      void shakeError();
      return;
    }

    // Greet by real first name + start the door-entering choreography on the
    // hero. After ~550 ms the full-screen DoorAnimation overlay takes over and
    // routes to the role's destination.
    const firstName =
      fresh?.user?.name?.split(" ")[0] ??
      email.split("@")[0].split(/[._-]/)[0] ??
      undefined;
    setDoorName(firstName);
    setDest(nextParam ?? HREF_BY_ROLE[realRole ?? role]);
    setPhase("entering");
    setTimeout(() => setPlayDoor(true), reduced ? 0 : HERO_TO_OVERLAY_MS);
  }

  return (
    <AuthShell role={role} mode="signin" heroPhase={phase}>
      <DoorAnimation
        active={playDoor}
        role={role}
        studentName={doorName}
        onComplete={() => {
          router.push(dest);
          router.refresh();
        }}
      />

      <BreatheCard shake={shake} reduced={!!reduced}>
        <GlassCard variant="strong" className="!p-6">
          <div className="mb-4">
            <h1 className="font-display font-extrabold text-2xl text-brand-ink tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-brand-muted mt-0.5">
              Sign in to pick up where you left off.
            </p>
          </div>

          <div className="mb-4">
            <RolePicker value={role} onChange={switchRole} variant="pills" />
            {process.env.NODE_ENV !== "production" && demoForActiveRole ? (
              <button
                type="button"
                onClick={() => {
                  setEmail(demoForActiveRole);
                  // Seed accounts (server/db/seeds/users.json) all use "demo".
                  setPassword("demo");
                }}
                className="mt-2 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-brand-primary/5 border border-brand-primary/15 text-[11px] font-semibold text-brand-primary hover:bg-brand-primary/10 hover:border-brand-primary/30 transition"
              >
                <Sparkles size={11} /> Try as {role} ·{" "}
                <span className="font-mono opacity-80">{demoForActiveRole}</span>
              </button>
            ) : null}
          </div>

          <motion.form
            ref={formRef}
            onSubmit={submit}
            className="space-y-2.5"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: reduced ? 0 : 0.04 } },
            }}
          >
            <motion.div variants={fieldV(reduced)} onFocus={handleFieldFocus} onBlur={handleFieldBlur}>
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
            </motion.div>

            <motion.div variants={fieldV(reduced)} onFocus={handleFieldFocus} onBlur={handleFieldBlur}>
              <PasswordField
                value={password}
                onValueChange={setPassword}
                autoComplete="current-password"
              />
              <div className="flex justify-end mt-1">
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-brand-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </motion.div>

            {err ? (
              <div
                role="alert"
                className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
              >
                {err}
              </div>
            ) : null}

            <motion.button
              type="submit"
              variants={fieldV(reduced)}
              disabled={busy || !email || !password}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white shadow-brand-glow/40 transition"
            >
              {busy ? (
                <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <>
                  Sign in <ArrowRight size={14} />
                </>
              )}
            </motion.button>
          </motion.form>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px bg-brand-ink/10 flex-1" />
            <span className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
              or
            </span>
            <span className="h-px bg-brand-ink/10 flex-1" />
          </div>

          <OAuthButtons
            callbackUrl={nextParam ?? HREF_BY_ROLE[role]}
            onError={setErr}
          />

          <p className="mt-5 text-center text-[11px] text-brand-muted">
            New here?{" "}
            <Link
              href="/signup"
              className="text-brand-primary font-semibold hover:underline"
            >
              Create an account
            </Link>
          </p>
        </GlassCard>
      </BreatheCard>
    </AuthShell>
  );
}

/**
 * BreatheCard — wraps the form card with two layered motions:
 *   1. The error-shake controls (passed in from parent).
 *   2. A constant soft box-shadow pulse that reads as "alive" without
 *      shifting layout pixels. Using box-shadow instead of scale keeps
 *      child elements stable for Playwright hit-testing.
 */
function BreatheCard({
  shake,
  reduced,
  children,
}: {
  shake: ReturnType<typeof useAnimationControls>;
  reduced: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div animate={shake}>
      <motion.div
        className="rounded-3xl"
        animate={
          reduced
            ? { boxShadow: "0 0 0px rgba(1,145,252,0)" }
            : {
                boxShadow: [
                  "0 0 0px rgba(1,145,252,0)",
                  "0 0 28px rgba(1,145,252,0.15)",
                  "0 0 0px rgba(1,145,252,0)",
                ],
              }
        }
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
}


function validateEmail(v: string) {
  if (!/\S+@\S+\.\S+/.test(v)) {
    return { ok: false, message: "That doesn't look like a valid email." };
  }
  return { ok: true };
}

function fieldV(reduced: boolean | null) {
  if (reduced) {
    return { hidden: { opacity: 0 }, show: { opacity: 1 } };
  }
  return {
    hidden: { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.32, ease: EASE_OUT_SOFT },
    },
  };
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginInner />
    </Suspense>
  );
}
