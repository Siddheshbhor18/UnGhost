"use client";

/**
 * /creatordashboard/activate?token=... — the page the creator-invite email
 * links to. Reads the one-time token from the query string, collects a new
 * password, POSTs to /api/creator/activate, and on success sends the creator
 * to the login screen. The token carries the authorization; there is no
 * session yet.
 */

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";

export default function CreatorActivatePage() {
  return (
    <Suspense fallback={null}>
      <ActivateForm />
    </Suspense>
  );
}

function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const policy = checkPolicy(password);
  const matches = password.length > 0 && password === confirm;
  const validToken = token.length >= 32;
  const canSubmit = policy.ok && matches && validToken && !submitting;

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/creator/activate", {
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
          throw new Error("This activation link has expired or already been used.");
        }
        throw new Error(
          data.reason ?? data.error ?? "Couldn't activate your account.",
        );
      }
      setDone(true);
      setTimeout(() => router.push("/login?activated=1"), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't activate your account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <Card surface="solid" elevation="raised" className="w-full max-w-md p-7">
        {done ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <CheckCircle2 className="text-brand-500" size={36} />
            <h1 className="text-lg font-semibold text-neutral-900">
              Account activated
            </h1>
            <p className="text-sm text-neutral-600">
              Your password is set. Redirecting you to sign in…
            </p>
          </div>
        ) : !validToken ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <h1 className="text-lg font-semibold text-neutral-900">
              Invalid activation link
            </h1>
            <p className="text-sm text-neutral-600">
              This link is missing or malformed. Ask your unGhost contact to
              resend your invitation.
            </p>
            <Link
              href="/login"
              className="text-sm font-semibold text-brand-500 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold text-neutral-900">
                Set your password
              </h1>
              <p className="text-sm text-neutral-600">
                Choose a password to activate your creator account.
              </p>
            </div>

            <Field label="Password" required>
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                leadingIcon={<Lock size={16} />}
                trailingNode={
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="text-neutral-500 hover:text-neutral-800"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            </Field>

            <Field
              label="Confirm password"
              required
              errorMessage={
                confirm.length > 0 && !matches ? "Passwords don't match." : undefined
              }
            >
              <Input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                leadingIcon={<Lock size={16} />}
                error={confirm.length > 0 && !matches}
              />
            </Field>

            {password.length > 0 && !policy.ok && (
              <p className="text-xs text-neutral-500">{policy.reason}</p>
            )}
            {error && <p className="text-sm text-error">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={!canSubmit}
            >
              Activate account
            </Button>

            <Link
              href="/login"
              className="text-center text-sm font-semibold text-brand-500 hover:underline"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </Card>
    </main>
  );
}

// Mirrors server/auth/password.ts checkPasswordPolicy
function checkPolicy(password: string): { ok: boolean; reason?: string } {
  if (password.length < 8) return { ok: false, reason: "Use at least 8 characters." };
  if (password.length > 72) return { ok: false, reason: "Password is too long." };
  if (!/[A-Z]/.test(password)) return { ok: false, reason: "Add an uppercase letter." };
  if (!/\d/.test(password)) return { ok: false, reason: "Add a number." };
  return { ok: true };
}
