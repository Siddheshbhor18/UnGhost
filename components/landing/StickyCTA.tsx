"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * StickyCTA — persistent conversion bar for the landing page on mobile.
 *
 * The landing page is ~8000px tall and the only entry points are the hero
 * (top) and the final CTA (bottom). On phones a visitor scrolling the middle
 * third (bootcamps, pricing, FAQ) has no always-available action. This bar
 * fades in once the hero has scrolled out (~`SHOW_AFTER_PX`) and pins the
 * primary "Browse live jobs" action to the bottom of the viewport.
 *
 * Mobile-only (`lg:hidden`) — desktop keeps the persistent nav CTA in view, so
 * a sticky bar there would be redundant chrome. The landing page is anon-only
 * (signed-in students are redirected to /dashboard), so the destination is
 * always the signup → jobs flow.
 */
const SHOW_AFTER_PX = 720;

export function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`lg:hidden fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
      style={{
        background:
          "linear-gradient(to top, rgba(255,255,255,0.96) 55%, rgba(255,255,255,0))",
      }}
    >
      <Link
        href="/jobs"
        className="flex h-13 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 text-base font-semibold text-white shadow-[0_10px_28px_rgba(1,145,252,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] transition-colors hover:bg-brand-600 active:scale-[0.99]"
        style={{ height: 52 }}
      >
        Browse live jobs
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}
