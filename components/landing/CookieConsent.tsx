"use client";

/**
 * Cookie consent — glass-premium DPDP banner.
 *
 * Frosted-white pill that floats over the hero gradient with the same
 * backdrop-blur and translucent-white treatment used throughout the landing
 * (nav, hero CTAs, twoways card). Two render shapes:
 *
 *   1. Inline strip → first render. Slim, single-row, never taller than
 *                     ~56px on mobile or ~64px on desktop.
 *   2. Collapsed pill → after `IDLE_MS` of no interaction OR after the user
 *                     scrolls past the hero. A 40px frosted pill that
 *                     re-expands the strip on tap. Explicit consent is still
 *                     required (DPDP), but the strip no longer steals
 *                     first-impression real estate.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const KEY = "unghost:dpdp_consent";
const IDLE_MS = 8000;
const SCROLL_COLLAPSE_PX = 400;

type Mode = "strip" | "pill";

export function CookieConsent() {
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<Mode>("strip");

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  useEffect(() => {
    if (!show || mode !== "strip") return;
    const idleId = window.setTimeout(() => setMode("pill"), IDLE_MS);
    const onScroll = () => {
      if (window.scrollY > SCROLL_COLLAPSE_PX) setMode("pill");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(idleId);
      window.removeEventListener("scroll", onScroll);
    };
  }, [show, mode]);

  const accept = useCallback((level: "all" | "essential") => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ level, at: Date.now(), tos: "v1" }),
    );
    setShow(false);
  }, []);

  if (!show) return null;

  if (mode === "pill") {
    return (
      <button
        type="button"
        onClick={() => setMode("strip")}
        aria-label="Open cookie consent"
        className="fixed bottom-4 right-4 z-50 grid place-items-center w-10 h-10 rounded-full bg-white/75 backdrop-blur-xl text-neutral-700 ring-1 ring-white/70 shadow-[0_8px_24px_rgba(10,10,10,0.08)] hover:bg-white/90 transition"
      >
        <Cookie size={16} />
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-3 inset-x-3 z-50 md:inset-x-auto md:right-4 md:bottom-4 md:max-w-xl"
    >
      <div className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-2xl ring-1 ring-white/70 shadow-[0_12px_40px_rgba(10,10,10,0.10)] pl-4 pr-2 py-2.5">
        <Cookie size={16} className="text-brand-500 shrink-0" aria-hidden />
        <p className="text-xs leading-snug flex-1 min-w-0 text-neutral-700">
          <span className="hidden sm:inline">
            We use essential + analytics cookies. DPDP-compliant — data stays in
            Mumbai.{" "}
          </span>
          <span className="sm:hidden">Cookies — essential + analytics. </span>
          <Link
            href="/privacy"
            className="underline text-brand-500 hover:text-brand-600 whitespace-nowrap"
          >
            Read policy
          </Link>
        </p>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => accept("essential")}
            className="text-xs px-3 h-8 rounded-lg text-neutral-700 hover:text-neutral-900 hover:bg-neutral-900/5 transition"
          >
            Essential
          </button>
          <button
            type="button"
            onClick={() => accept("all")}
            className="text-xs px-3 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium shadow-[0_4px_12px_rgba(1,145,252,0.30)] transition"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={() => setMode("pill")}
            aria-label="Collapse"
            className="grid place-items-center w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-900/5 transition"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
