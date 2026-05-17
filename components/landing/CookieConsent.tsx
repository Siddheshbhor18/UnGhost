"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const KEY = "unghost:dpdp_consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setShow(true);
  }, []);

  function accept(level: "all" | "essential") {
    localStorage.setItem(
      KEY,
      JSON.stringify({ level, at: Date.now(), tos: "v1" }),
    );
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 md:inset-x-auto md:right-6 md:max-w-md">
      <div className="rounded-2xl bg-white/90 backdrop-blur-xl border border-white/60 shadow-glass-lg p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Cookie size={16} className="text-brand-primary" />
            <p className="font-display font-semibold text-brand-ink">
              Cookies &amp; consent
            </p>
          </div>
          <button
            onClick={() => accept("essential")}
            className="text-brand-muted hover:text-brand-ink"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-brand-muted leading-relaxed mb-4">
          We use essential cookies to keep you logged in and analytics to improve the
          product. DPDP Act compliant — your data stays in Mumbai.{" "}
          <Link href="/privacy" className="text-brand-primary underline">
            Read policy
          </Link>
          .
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => accept("all")}
            className="btn-brand text-xs px-4 py-2 flex-1 justify-center"
          >
            Accept all
          </button>
          <button
            onClick={() => accept("essential")}
            className="btn-glass text-xs px-4 py-2 flex-1 justify-center"
          >
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
}
