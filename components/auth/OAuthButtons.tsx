"use client";

import { motion, useReducedMotion } from "framer-motion";
import { signIn } from "next-auth/react";

/**
 * OAuthButtons — Google sign-in button. LinkedIn was retired pre-launch
 * (B2C app, low ROI vs the 1-2 week LinkedIn app review).
 *
 * Behaviour:
 *   • Click → next-auth signIn("google") with the same callbackUrl that the
 *     existing /login + /signup pages were using.
 *   • Gracefully fails when env keys aren't set — next-auth throws and our
 *     `.catch` surfaces the error via `onError`.
 *   • Honours prefers-reduced-motion (whileHover disabled below).
 */
interface Props {
  callbackUrl?: string;
  onError?: (msg: string) => void;
  /** When true, render only icon-circle version (tight layouts). */
  compact?: boolean;
}

export function OAuthButtons({ callbackUrl, onError, compact }: Props) {
  const reduced = useReducedMotion();
  const hoverProps = reduced ? {} : { whileHover: { scale: 1.015 }, whileTap: { scale: 0.985 } };

  async function go() {
    try {
      await signIn("google", callbackUrl ? { callbackUrl } : undefined);
    } catch {
      onError?.("Google OAuth not configured. Use the email form for now.");
    }
  }

  if (compact) {
    return (
      <motion.button
        type="button"
        aria-label="Continue with Google"
        onClick={go}
        className="grid place-items-center w-11 h-11 rounded-xl bg-white border border-brand-ink/10 shadow-sm hover:shadow-md transition"
        {...hoverProps}
      >
        <GoogleGlyph size={18} />
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={go}
      className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-white border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink shadow-sm hover:shadow-md transition"
      {...hoverProps}
    >
      <GoogleGlyph size={16} />
      Continue with Google
    </motion.button>
  );
}

/** Official Google G in the four brand colours. Inline SVG — no extra dep. */
function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A10.99 10.99 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
