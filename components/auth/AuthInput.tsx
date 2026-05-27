"use client";

import { useEffect, useId, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import clsx from "clsx";

/**
 * AuthInput — the building block for the redesigned sign-in + sign-up forms.
 *
 *   • Floating label that rises on focus or when value is present.
 *   • Glass-tinted resting state + brand glow on focus.
 *   • Right-side validation icon (green check ✓ on valid, red X on invalid).
 *   • Errors only render after the first blur, so red Xs never flash on load.
 *   • Real-time validation is debounced (250 ms) — caller controls validity
 *     via the `validate` prop returning `{ ok, message? }`.
 *   • Honours prefers-reduced-motion via framer-motion's hook.
 *
 * Intentionally not a clone of the editorial `Input` from components/ui — that
 * one targets dashboards. This one targets auth screens specifically.
 */
type ValidateFn = (value: string) => { ok: boolean; message?: string };

export interface AuthInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  leadingIcon?: React.ReactNode;
  trailingNode?: React.ReactNode;
  value: string;
  onValueChange: (next: string) => void;
  /** Sync validator — runs on every change after first blur (debounced). */
  validate?: ValidateFn;
  /** Force-show the error externally (e.g. server-side rejection). */
  externalError?: string | null;
  /** Use tabular-numerals (good for phone). */
  tnum?: boolean;
  className?: string;
}

export function AuthInput({
  label,
  leadingIcon,
  trailingNode,
  value,
  onValueChange,
  validate,
  externalError,
  tnum,
  className,
  type = "text",
  ...rest
}: AuthInputProps) {
  const id = useId();
  const reduced = useReducedMotion();
  const [focused, setFocused] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [internalValidity, setInternalValidity] = useState<{
    ok: boolean;
    message?: string;
  } | null>(null);

  // Debounce validation so we don't recompute on every keystroke (and so the
  // icon doesn't flicker as the user types).
  useEffect(() => {
    if (!validate) return;
    if (!value) {
      setInternalValidity(null);
      return;
    }
    const t = setTimeout(() => {
      setInternalValidity(validate(value));
    }, 250);
    return () => clearTimeout(t);
  }, [value, validate]);

  const hasValue = value.length > 0;
  const isFloating = focused || hasValue;
  const showValidation = blurred && internalValidity !== null;
  const isValid = internalValidity?.ok === true;
  const isInvalid = showValidation && internalValidity?.ok === false;
  const errorMessage = externalError ?? (isInvalid ? internalValidity?.message : undefined);

  return (
    <div className={clsx("w-full", className)}>
      <div
        className={clsx(
          "relative rounded-xl border bg-white/60 backdrop-blur-md transition-all duration-200 h-[58px]",
          focused
            ? "border-brand-primary shadow-[0_0_0_4px_rgba(1,145,252,0.12)]"
            : errorMessage
              ? "border-rose-500"
              : "border-brand-ink/15 hover:border-brand-ink/25",
        )}
      >
        {leadingIcon ? (
          <span
            className={clsx(
              "absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none transition-colors z-10",
              focused && "text-brand-primary",
              errorMessage && "text-rose-500",
            )}
            aria-hidden="true"
          >
            {leadingIcon}
          </span>
        ) : null}

        <motion.label
          htmlFor={id}
          initial={false}
          animate={
            reduced
              ? {
                  top: isFloating ? 8 : 28,
                  scale: isFloating ? 0.78 : 1,
                }
              : {
                  top: isFloating ? 8 : 28,
                  scale: isFloating ? 0.78 : 1,
                  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
                }
          }
          style={{ y: "-50%" }}
          className={clsx(
            "absolute origin-left pointer-events-none select-none transition-colors duration-150 leading-none",
            leadingIcon ? "left-10" : "left-3.5",
            isFloating
              ? "text-[10px] font-semibold uppercase tracking-wider"
              : "text-sm",
            focused
              ? "text-brand-primary"
              : errorMessage
                ? "text-rose-600"
                : "text-brand-muted",
          )}
        >
          {label}
        </motion.label>

        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            setBlurred(true);
            if (validate && value) setInternalValidity(validate(value));
          }}
          aria-invalid={!!errorMessage}
          aria-describedby={errorMessage ? `${id}-error` : undefined}
          className={clsx(
            "absolute inset-0 w-full h-full bg-transparent outline-none text-sm font-medium text-brand-ink rounded-xl leading-none",
            leadingIcon ? "pl-10" : "pl-3.5",
            showValidation || trailingNode ? "pr-10" : "pr-3.5",
            "pt-6 pb-2",
            tnum && "tnum",
          )}
          {...rest}
        />

        <AnimatePresence>
          {showValidation && isValid ? (
            <motion.span
              key="ok"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none"
              aria-hidden="true"
            >
              <Check size={16} strokeWidth={2.5} />
            </motion.span>
          ) : null}
          {showValidation && isInvalid ? (
            <motion.span
              key="bad"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-600 pointer-events-none"
              aria-hidden="true"
            >
              <X size={16} strokeWidth={2.5} />
            </motion.span>
          ) : null}
        </AnimatePresence>

        {trailingNode && !showValidation ? (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
            {trailingNode}
          </span>
        ) : null}
      </div>

      <AnimatePresence>
        {errorMessage ? (
          <motion.p
            id={`${id}-error`}
            role="alert"
            aria-live="polite"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-[11px] text-rose-600 mt-1.5 ml-1"
          >
            {errorMessage}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
