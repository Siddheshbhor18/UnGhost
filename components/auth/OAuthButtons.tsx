"use client";

import { motion, useReducedMotion } from "framer-motion";
import { signIn } from "next-auth/react";

/**
 * OAuthButtons — branded sign-in options for Google + LinkedIn. Replaces the
 * earlier plain-text "Continue with Google / LinkedIn" buttons.
 *
 * Behaviour:
 *   • Click → next-auth signIn(provider) with the same callbackUrl that the
 *     existing /login + /signup pages were using.
 *   • Buttons gracefully fail when the env keys aren't set — next-auth throws
 *     and our `.catch` surfaces the error via `onError`.
 *   • Honours prefers-reduced-motion (whileHover disabled below).
 *
 * Visual:
 *   • Google: white card, multi-colour G glyph, soft hover shadow.
 *   • LinkedIn: official #0A66C2 with white "in" mark.
 */
interface Props {
  callbackUrl?: string;
  onError?: (msg: string) => void;
  /** When true, render only icon-circle versions (tight layouts). */
  compact?: boolean;
}

export function OAuthButtons({ callbackUrl, onError, compact }: Props) {
  const reduced = useReducedMotion();
  const hoverProps = reduced ? {} : { whileHover: { scale: 1.015 }, whileTap: { scale: 0.985 } };

  async function go(provider: "google" | "linkedin") {
    try {
      await signIn(provider, callbackUrl ? { callbackUrl } : undefined);
    } catch (err) {
      onError?.(
        provider === "google"
          ? "Google OAuth not configured. Use the email form for now."
          : "LinkedIn OAuth not configured. Use the email form for now.",
      );
    }
  }

  if (compact) {
    return (
      <div className="flex gap-2">
        <motion.button
          type="button"
          aria-label="Continue with Google"
          onClick={() => go("google")}
          className="grid place-items-center w-11 h-11 rounded-xl bg-white border border-brand-ink/10 shadow-sm hover:shadow-md transition"
          {...hoverProps}
        >
          <GoogleGlyph size={18} />
        </motion.button>
        <motion.button
          type="button"
          aria-label="Continue with LinkedIn"
          onClick={() => go("linkedin")}
          className="grid place-items-center w-11 h-11 rounded-xl bg-[#0A66C2] hover:bg-[#0959AB] text-white shadow-sm hover:shadow-md transition"
          {...hoverProps}
        >
          <LinkedInGlyph size={18} />
        </motion.button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <motion.button
        type="button"
        onClick={() => go("google")}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-white border border-brand-ink/10 px-4 py-2.5 text-sm font-semibold text-brand-ink shadow-sm hover:shadow-md transition"
        {...hoverProps}
      >
        <GoogleGlyph size={16} />
        Continue with Google
      </motion.button>
      <motion.button
        type="button"
        onClick={() => go("linkedin")}
        className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#0A66C2] hover:bg-[#0959AB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition"
        {...hoverProps}
      >
        <LinkedInGlyph size={16} />
        Continue with LinkedIn
      </motion.button>
    </div>
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

/** Stylised "in" LinkedIn glyph. */
function LinkedInGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3v9zM6.5 8.25A1.75 1.75 0 1 1 6.5 4.75 1.75 1.75 0 0 1 6.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93s-1.62.59-1.62 1.97V19h-3v-9h2.9v1.3c.3-.6 1.34-1.62 2.92-1.62 1.7 0 3.18 1.07 3.18 3.66V19z" />
    </svg>
  );
}
