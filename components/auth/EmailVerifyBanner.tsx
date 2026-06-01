"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, Mail, X } from "lucide-react";

/**
 * EmailVerifyBanner — slim, dismissible top strip nudging signed-in users
 * with an UNVERIFIED email to confirm it. Soft by design: we do NOT block
 * login on verification (that would tank conversion), we just surface a
 * persistent, low-friction reminder + a one-click resend.
 *
 * Self-hiding global widget (mounted once in the root layout, like
 * DemoModeBadge): it probes /api/auth/verify-status on mount and renders
 * nothing for anonymous users, verified users, on auth screens, or once the
 * user dismisses it for the session.
 *
 * It reads status from an API call rather than the session token because the
 * 30-day JWT doesn't refresh when the user verifies — the store is the source
 * of truth.
 */

const DISMISS_KEY = "unghost:dismiss_verify_banner";

// Routes where a top banner is redundant or obtrusive (the auth flow itself).
const HIDDEN_PREFIXES = [
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/admin-login",
  "/recruiter/login",
];

type Probe = { authenticated: boolean; emailVerified?: boolean; email?: string };

export function EmailVerifyBanner() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const onHiddenRoute = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (onHiddenRoute) {
      setShow(false);
      return;
    }
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* sessionStorage unavailable (SSR/locked) — just proceed */
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-status", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as Probe;
        if (cancelled) return;
        if (data.authenticated && data.emailVerified === false) {
          setEmail(data.email ?? null);
          setShow(true);
        }
      } catch {
        /* network blip — banner simply doesn't show */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, onHiddenRoute]);

  async function resend() {
    if (!email || sending) return;
    setSending(true);
    try {
      await fetch("/api/auth/resend-email-verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      /* opaque endpoint — even on failure we don't surface details */
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  function dismiss() {
    setShow(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!show || onHiddenRoute) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-amber-500/95 backdrop-blur-sm text-amber-950 shadow-sm">
      <div className="mx-auto max-w-5xl flex items-center gap-3 px-4 py-2 text-sm">
        <Mail size={15} className="shrink-0" />
        <p className="flex-1 leading-snug">
          {sent ? (
            <>Verification link sent. Check your inbox{email ? ` (${email})` : ""}.</>
          ) : (
            <>
              Confirm your email to secure your account
              {email ? ` (${email})` : ""}.
            </>
          )}
        </p>
        {!sent && (
          <button
            type="button"
            onClick={resend}
            disabled={sending || !email}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-950/10 hover:bg-amber-950/20 disabled:opacity-50 px-3 py-1 text-xs font-semibold transition"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : null}
            Resend link
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-lg p-1 hover:bg-amber-950/10 transition"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
