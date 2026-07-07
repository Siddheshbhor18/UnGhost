"use client";

/**
 * EnrollViaWhatsApp — the featured-speaker enrollment controls.
 *
 *  • "Enroll via WhatsApp" opens a short form (name, phone, email, profession).
 *    Submitting opens WhatsApp to the host's number with a pre-filled message
 *    carrying those details + "I want to enroll for the session", so the
 *    prospect lands in a DM ready to send.
 *  • "Share" copies a link back to the featured-speaker section so the visitor
 *    can invite friends; the link's only job is to scroll them to this section.
 *
 * The form is a native <dialog> (showModal) — top-layer, so it escapes the
 * panel's overflow-hidden + the section's transformed ancestor, and gets
 * focus-trap + Escape for free.
 */

import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { Share2, Check, X } from "lucide-react";
import { WhatsAppGlyph } from "./WhatsAppGlyph";

// Host's WhatsApp number in full international form (India, +91). wa.me needs
// the country code with no "+", spaces, or dashes.
const WHATSAPP_NUMBER = "919579662005";
// The featured-speaker section anchor a shared link scrolls to.
const SECTION_HASH = "#featured-speaker";

const FIELDS = [
  { name: "name", label: "Full name", type: "text", autoComplete: "name", placeholder: "Your name" },
  { name: "phone", label: "Phone number", type: "tel", autoComplete: "tel", placeholder: "10-digit mobile" },
  { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@email.com" },
  { name: "profession", label: "Profession", type: "text", autoComplete: "organization-title", placeholder: "e.g. CA, student, founder" },
] as const;

type FieldName = (typeof FIELDS)[number]["name"];
type FormState = Record<FieldName, string>;

const EMPTY: FormState = { name: "", phone: "", email: "", profession: "" };

/** `compact` stacks the controls for the landing's compact speaker card and
 *  drops the helper caption (the dialog explains the flow itself). */
export function EnrollViaWhatsApp({ compact = false }: { compact?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [copied, setCopied] = useState(false);

  // A shared link (…/#featured-speaker) must reliably land on this section.
  // Two gotchas on this long, lazily-laid-out page: (1) the native anchor jump
  // fires before the height settles, landing short; (2) the page's global
  // smooth-scroll stalls partway on a jump this long. So we force an instant
  // scroll and re-apply once after layout settles.
  useEffect(() => {
    if (window.location.hash !== SECTION_HASH) return;
    const jump = () => {
      const el = document.getElementById("featured-speaker");
      if (!el) return;
      const html = document.documentElement;
      const prev = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto"; // defeat CSS smooth (it stalls here)
      el.scrollIntoView({ block: "start" }); // scroll-mt clears the sticky navbar
      html.style.scrollBehavior = prev;
    };
    const t1 = window.setTimeout(jump, 250);
    const t2 = window.setTimeout(jump, 800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);
  function openForm() {
    dialogRef.current?.showModal();
  }
  function closeForm() {
    dialogRef.current?.close();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = [
      "Hi, I want to enroll for the session.",
      "",
      `Full name: ${form.name}`,
      `Phone: ${form.phone}`,
      `Email: ${form.email}`,
      `Profession: ${form.profession}`,
    ].join("\n");
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    closeForm();
  }

  async function handleShare() {
    const link = `${window.location.origin}/${SECTION_HASH}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions): fall back to the
      // share sheet where available so the action still works.
      if (navigator.share) {
        try {
          await navigator.share({ title: "Free workshop with Abhinav Ranka", url: link });
        } catch {
          /* user dismissed the share sheet — nothing to do */
        }
      }
    }
  }

  // Close when the backdrop (the dialog element itself) is clicked.
  function handleDialogClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) closeForm();
  }

  return (
    <>
      <div
        className={
          compact
            ? "flex flex-wrap items-center gap-2.5"
            : "mt-5 flex flex-wrap items-center gap-3"
        }
      >
        {/* Brand fill, not WhatsApp green: the landing commits to one accent
            (PRODUCT.md), and white on brand-700 clears WCAG AA. The glyph
            still says "this opens WhatsApp". */}
        <button
          type="button"
          onClick={openForm}
          className="inline-flex items-center justify-center gap-2.5 rounded-xl px-6 h-12 text-[15px] font-semibold text-white bg-brand-700 hover:bg-brand-800 shadow-[0_10px_28px_rgba(1,145,252,0.32),inset_0_1px_0_rgba(255,255,255,0.2)] transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]"
        >
          <WhatsAppGlyph />
          Enroll via WhatsApp
        </button>

        <button
          type="button"
          onClick={handleShare}
          aria-live="polite"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-5 h-12 text-[15px] font-semibold text-white ring-1 ring-white/15 bg-white/[0.06] hover:bg-white/[0.10] hover:ring-white/25 transition-colors duration-200 active:scale-[0.99]"
        >
          {copied ? (
            <>
              <Check size={17} className="text-[#6DB6F9]" />
              Link copied
            </>
          ) : (
            <>
              <Share2 size={17} />
              Share
            </>
          )}
        </button>
      </div>

      {!compact && (
        <p className="mt-2 text-[12px] text-white/45 max-w-md">
          Add your details, then WhatsApp opens with your enrollment message
          ready to send.
        </p>
      )}

      <dialog
        ref={dialogRef}
        onClick={handleDialogClick}
        aria-labelledby="enroll-title"
        className="w-[calc(100vw-2rem)] max-w-md rounded-2xl p-0 text-white backdrop:bg-black/70 backdrop:backdrop-blur-sm"
        style={{ background: "#0B0F17", boxShadow: "0 30px 90px -24px rgba(0,0,0,0.85)" }}
      >
        <form onSubmit={handleSubmit} className="relative p-6 sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10"
          />

          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 id="enroll-title" className="text-[19px] font-bold tracking-tight">
                Enroll for the session
              </h3>
              <p className="mt-1 text-[13px] text-white/55">
                Free online workshop with Abhinav Ranka.
              </p>
            </div>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close"
              className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 space-y-3.5">
            {FIELDS.map((f) => (
              <label key={f.name} className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
                  {f.label}
                </span>
                <input
                  name={f.name}
                  type={f.type}
                  required
                  autoComplete={f.autoComplete}
                  placeholder={f.placeholder}
                  value={form[f.name]}
                  onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                  className="w-full rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/35 ring-1 ring-white/10 outline-none transition-shadow focus:ring-2 focus:ring-[#0191FC]/70"
                />
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-xl h-12 text-[15px] font-semibold text-white bg-brand-700 hover:bg-brand-800 shadow-[0_10px_28px_rgba(1,145,252,0.32),inset_0_1px_0_rgba(255,255,255,0.2)] transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]"
          >
            <WhatsAppGlyph />
            Enroll
          </button>
        </form>
      </dialog>
    </>
  );
}
