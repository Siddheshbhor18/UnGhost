"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, AlertTriangle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AuthInput } from "./AuthInput";

/**
 * PasswordField — AuthInput specialized for passwords.
 *
 *   • Show/hide eye toggle (right side, replaces the trailing validation icon).
 *   • CapsLock detection — shows an inline warning below the field when
 *     CapsLock is on while typing. Avoids the classic "wrong password" mystery.
 *   • Honours all the AuthInput props otherwise.
 */
interface Props {
  label?: string;
  value: string;
  onValueChange: (next: string) => void;
  autoComplete?: string;
  required?: boolean;
}

export function PasswordField({
  label = "Password",
  value,
  onValueChange,
  autoComplete = "current-password",
  required,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const next = e.getModifierState && e.getModifierState("CapsLock");
    setCapsLockOn(!!next);
  }

  return (
    <div onKeyDown={handleKey} onKeyUp={handleKey}>
      <AuthInput
        label={label}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        leadingIcon={<Lock size={14} />}
        value={value}
        onValueChange={onValueChange}
        required={required}
        trailingNode={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="grid place-items-center w-7 h-7 rounded-md text-brand-muted hover:text-brand-ink hover:bg-brand-ink/5 transition"
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      />
      <AnimatePresence>
        {capsLockOn && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="text-[11px] text-amber-700 mt-1.5 ml-1 inline-flex items-center gap-1"
          >
            <AlertTriangle size={11} /> Caps Lock is on
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
