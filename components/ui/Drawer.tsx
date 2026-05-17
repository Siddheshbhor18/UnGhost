"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import clsx from "clsx";

export type DrawerSide = "right" | "left" | "bottom";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  title?: string;
  description?: string;
  /** Width (right/left) or height (bottom). Defaults: 720px / 80vh. */
  size?: number | string;
  footer?: ReactNode;
  hideClose?: boolean;
  children: ReactNode;
}

const SIDE_CLASS: Record<DrawerSide, string> = {
  right: "top-0 right-0 h-full w-full sm:w-[min(60vw,720px)]",
  left: "top-0 left-0 h-full w-full sm:w-[min(60vw,720px)]",
  bottom: "bottom-0 left-0 right-0 w-full max-h-[80vh]",
};

const VARIANTS = {
  right: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
  },
  left: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
  },
  bottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  },
} as const;

/**
 * Slide-over drawer. Side = right (default) | left | bottom (mobile sheet).
 * Heavy glass surface, ESC + scrim close, focus on open.
 */
export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  description,
  size,
  footer,
  hideClose,
  children,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  const sizeStyle: React.CSSProperties =
    size !== undefined
      ? side === "bottom"
        ? { maxHeight: typeof size === "number" ? `${size}px` : size }
        : { width: typeof size === "number" ? `${size}px` : size }
      : {};

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300]"
          style={{ backgroundColor: "rgba(10,10,10,0.4)" }}
          onClick={onClose}
        >
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "drawer-title" : undefined}
            initial={VARIANTS[side].initial}
            animate={VARIANTS[side].animate}
            exit={VARIANTS[side].exit}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={clsx(
              "fixed glass-heavy flex flex-col overflow-hidden",
              SIDE_CLASS[side],
              side === "bottom" ? "!rounded-t-3xl !rounded-b-none" : "!rounded-none",
            )}
            style={sizeStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {side === "bottom" && (
              <div className="grid place-items-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-neutral-300" />
              </div>
            )}
            {(title || !hideClose) && (
              <header className="relative px-6 pt-6 pb-3">
                {title && (
                  <h2
                    id="drawer-title"
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
            <div className="flex-1 px-6 py-4 overflow-y-auto">{children}</div>
            {footer && (
              <footer className="px-6 py-4 border-t border-neutral-200 bg-neutral-25/60 flex items-center justify-end gap-2">
                {footer}
              </footer>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
