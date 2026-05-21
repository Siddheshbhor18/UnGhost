"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import clsx from "clsx";

/**
 * CheckboxConsent — custom-styled consent checkbox for the signup wizard.
 *
 * Replaces the native `<input type="checkbox">` with a tap-friendly
 * 18×18 rounded box that animates a tick stroke when checked. Keeps the
 * underlying input around for form semantics + a11y so screen readers and
 * keyboard users get the standard checkbox experience.
 */
interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function CheckboxConsent({
  checked,
  onChange,
  label,
  required,
  className,
}: Props) {
  const id = useId();
  const reduced = useReducedMotion();
  return (
    <label
      htmlFor={id}
      className={clsx(
        "flex items-start gap-2.5 cursor-pointer select-none",
        className,
      )}
    >
      {/* visually-hidden native input keeps a11y + form semantics intact */}
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        required={required}
      />
      <span
        aria-hidden="true"
        className={clsx(
          "mt-0.5 grid place-items-center w-[18px] h-[18px] rounded-md border-2 transition-colors shrink-0",
          checked
            ? "bg-brand-primary border-brand-primary"
            : "bg-white/60 border-brand-ink/25 hover:border-brand-primary/60",
        )}
      >
        {/* Animated SVG check — stroke is drawn-on so the tick "writes" itself. */}
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
          <motion.path
            d="M2 5.5L4.5 8L9 2.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={
              reduced
                ? { pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }
                : {
                    pathLength: checked ? 1 : 0,
                    opacity: checked ? 1 : 0,
                    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                  }
            }
          />
        </svg>
      </span>
      <span className="text-[11px] text-brand-ink/85 leading-relaxed">
        {label}
        {required ? <span className="text-rose-600 ml-0.5">*</span> : null}
      </span>
    </label>
  );
}
