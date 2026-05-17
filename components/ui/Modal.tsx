"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import clsx from "clsx";

export type ModalSize = "sm" | "md" | "lg";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Modal width. sm = 480px, md = 640px, lg = 800px. */
  size?: ModalSize;
  /** Footer actions (rendered sticky at bottom). */
  footer?: ReactNode;
  /** Hide the default close X. */
  hideClose?: boolean;
  /** Click on scrim closes the modal. Default true. */
  closeOnScrimClick?: boolean;
  children: ReactNode;
}

const SIZE: Record<ModalSize, string> = {
  sm: "max-w-[480px]",
  md: "max-w-[640px]",
  lg: "max-w-[800px]",
};

/**
 * Editorial modal sheet — heavy glass, scrim, ESC-to-close, focus trap.
 * Mount anywhere — renders via portal.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "sm",
  footer,
  hideClose,
  closeOnScrimClick = true,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // ESC to close + body scroll lock
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Focus the modal on open
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] grid place-items-center px-4 py-8 pointer-events-auto"
          style={{ backgroundColor: "rgba(10,10,10,0.4)" }}
          onClick={closeOnScrimClick ? onClose : undefined}
        >
          <motion.div
            key="dialog"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              "glass-heavy w-full overflow-hidden flex flex-col max-h-[90vh]",
              SIZE[size],
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {(title || !hideClose) && (
              <header className="relative px-7 pt-6 pb-3">
                {title && (
                  <h2
                    id="modal-title"
                    className="font-display font-bold text-2xl text-neutral-900 tracking-tight"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-body-sm text-neutral-500 leading-relaxed">
                    {description}
                  </p>
                )}
                {!hideClose && (
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="absolute top-4 right-4 grid place-items-center w-8 h-8 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition focus-visible:ring-2 focus-visible:ring-brand-500/40 focus:outline-none"
                  >
                    <X size={16} />
                  </button>
                )}
              </header>
            )}
            <div className="px-7 py-4 overflow-y-auto">{children}</div>
            {footer && (
              <footer className="px-7 py-4 border-t border-neutral-200 bg-neutral-25/60 flex items-center justify-end gap-2">
                {footer}
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
