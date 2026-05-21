"use client";

import { useEffect } from "react";

/**
 * RefCapture — captures the `?ref=<code>` URL param and persists it for 30
 * days so the partner who sent the visitor gets attributed even if signup
 * happens days later.
 *
 * Mount once in the root layout. Runs only on the client.
 *
 *   • Reads `?ref=...` from URL on mount.
 *   • Stores `{ code, ts }` to localStorage under `unghost_ref`.
 *   • TTL: 30 days from first capture. Subsequent ?ref overwrites (so a
 *     new partner link always wins — last-touch attribution).
 *   • SignupWizard reads this value on submit and posts it as
 *     `referrerCode`.
 */
const STORAGE_KEY = "unghost_ref";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface StoredRef {
  code: string;
  ts: number;
}

export function RefCapture() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get("ref");
      if (!ref) return;
      // Sanitise — only allow URL-safe slug chars to dodge cross-site
      // injection if anyone tries to smuggle JS via the ref param later.
      const clean = ref.replace(/[^a-z0-9-]/gi, "").slice(0, 64);
      if (!clean) return;
      const payload: StoredRef = { code: clean.toLowerCase(), ts: Date.now() };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // localStorage unavailable (private mode, etc) — silently no-op.
    }
  }, []);
  return null;
}

/**
 * Helper for the signup form. Returns the active ref code or `undefined`
 * if absent / expired.
 */
export function getCapturedRef(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredRef;
    if (!parsed?.code || !parsed?.ts) return undefined;
    if (Date.now() - parsed.ts > TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return undefined;
    }
    return parsed.code;
  } catch {
    return undefined;
  }
}

/** Used by the wizard right after submit success — clear so the next visitor
 *  on the same machine isn't accidentally attributed to the previous code. */
export function clearCapturedRef(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}
