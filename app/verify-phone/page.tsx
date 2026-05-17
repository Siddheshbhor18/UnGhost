"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Phone,
  RotateCw,
  Sparkles,
} from "lucide-react";
import {
  BlobField,
  GlassBadge,
  GlassButton,
  GlassCard,
  Logo,
} from "@/components/glass";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 30;
const LOCKOUT_AFTER_FAILS = 3;
const LOCKOUT_MINUTES = 15;

function VerifyPhoneInner() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "+91 98xxxxxxxx";
  const next = params.get("next") ?? "/onboarding";

  const [digits, setDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const [phase, setPhase] = useState<
    "input" | "verifying" | "success" | "error" | "locked"
  >("input");
  const [fails, setFails] = useState(0);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [mode, setMode] = useState<"live" | "mock">("mock");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  // Request the OTP from the SMS adapter on mount (and on resend).
  async function requestOtp() {
    if (phone.startsWith("+91 98xxxx")) return; // placeholder, skip
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      setMode(data.mode ?? "mock");
      setDemoOtp(data.demoOtp ?? null);
    } catch {
      /* keep UI usable even if request fails */
    }
  }

  useEffect(() => {
    requestOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function setDigit(idx: number, val: string) {
    const v = val.replace(/[^0-9]/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[idx] = v;
      return next;
    });
    if (v && idx < OTP_LENGTH - 1) {
      inputs.current[idx + 1]?.focus();
    }
    // Auto-submit on last digit
    if (v && idx === OTP_LENGTH - 1) {
      const code = digits
        .map((d, i) => (i === idx ? v : d))
        .join("");
      if (code.length === OTP_LENGTH) submit(code);
    }
  }

  function onKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) submit(pasted);
  }

  async function submit(code: string) {
    if (phase === "verifying") return;
    setPhase("verifying");
    let ok = false;
    try {
      const res = await fetch("/api/otp", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      ok = !!data.ok;
    } catch {
      ok = false;
    }
    if (ok) {
      setPhase("success");
      setTimeout(() => router.push(next), 1200);
      return;
    }
    const nextFails = fails + 1;
    setFails(nextFails);
    if (nextFails >= LOCKOUT_AFTER_FAILS) {
      setPhase("locked");
    } else {
      setPhase("error");
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => {
        setPhase("input");
        inputs.current[0]?.focus();
      }, 1200);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setCooldown(RESEND_COOLDOWN_SEC);
    await requestOtp();
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
            <ArrowLeft size={12} /> Back
          </Link>

          <GlassBadge tone="brand">
            <Phone size={11} /> Phone verification
          </GlassBadge>
          <h1 className="font-display font-extrabold text-2xl text-brand-ink mt-3">
            Confirm it&apos;s you.
          </h1>
          <p className="text-sm text-brand-muted mt-2 leading-relaxed">
            We sent a 6-digit code to{" "}
            <span className="font-mono font-semibold text-brand-ink">
              {phone}
            </span>
            . Expires in 5 minutes.
          </p>

          {/* Demo OTP banner — only shows when SMS adapter is in mock mode */}
          {mode === "mock" && demoOtp && (
            <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 flex items-start gap-2">
              <Sparkles
                size={13}
                className="text-amber-700 mt-0.5 shrink-0"
              />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>Demo mode:</strong> your OTP is{" "}
                <span className="font-mono font-bold">{demoOtp}</span> · add
                <code className="mx-1">MSG91_AUTH_KEY</code> to send real SMS.
              </p>
            </div>
          )}

          {phase === "locked" ? (
            <div className="mt-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 text-center">
              <p className="font-display font-bold text-rose-700">
                Too many wrong attempts
              </p>
              <p className="text-sm text-brand-muted mt-2">
                Locked for {LOCKOUT_MINUTES} minutes. For urgent access email{" "}
                <a
                  href="mailto:support@unghost.com"
                  className="text-brand-primary underline"
                >
                  support@unghost.com
                </a>
                .
              </p>
            </div>
          ) : (
            <>
              {/* Code input */}
              <div className="mt-6 flex justify-center gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={1}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKey(i, e)}
                    onPaste={onPaste}
                    disabled={phase === "verifying" || phase === "success"}
                    className={`w-11 h-12 sm:w-12 sm:h-14 text-center font-display text-xl font-bold rounded-xl border-2 transition focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ${
                      phase === "error"
                        ? "border-rose-500 bg-rose-500/10 text-rose-700 animate-pulse"
                        : phase === "success"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                        : d
                        ? "border-brand-primary bg-brand-primary/5 text-brand-ink"
                        : "border-brand-ink/15 bg-white/60 text-brand-ink"
                    }`}
                  />
                ))}
              </div>

              {phase === "error" && (
                <p className="text-sm text-rose-700 text-center mt-3 font-semibold">
                  Wrong code · {LOCKOUT_AFTER_FAILS - fails} attempt
                  {LOCKOUT_AFTER_FAILS - fails === 1 ? "" : "s"} left
                </p>
              )}

              {phase === "verifying" && (
                <p className="text-sm text-brand-muted text-center mt-3 inline-flex items-center justify-center gap-2 w-full">
                  <Loader2
                    size={14}
                    className="animate-spin text-brand-primary"
                  />
                  Verifying…
                </p>
              )}

              {phase === "success" && (
                <p className="text-sm text-emerald-700 text-center mt-3 font-semibold inline-flex items-center justify-center gap-2 w-full">
                  <CheckCircle2 size={14} /> Verified · redirecting…
                </p>
              )}

              {/* Resend */}
              <div className="mt-6 text-center">
                <button
                  onClick={resend}
                  disabled={cooldown > 0 || phase === "verifying"}
                  className="text-xs font-semibold text-brand-primary disabled:text-brand-muted inline-flex items-center gap-1"
                >
                  <RotateCw size={11} />
                  {cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : "Resend code"}
                </button>
              </div>
            </>
          )}

          <p className="text-[11px] text-brand-muted text-center mt-6">
            Wrong number?{" "}
            <Link
              href="/login"
              className="text-brand-primary font-semibold"
            >
              Sign in differently
            </Link>
          </p>
        </GlassCard>
      </div>
    </main>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <VerifyPhoneInner />
    </Suspense>
  );
}
