"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import clsx from "clsx";

export type ToastTone = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastCtx {
  push: (t: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

const TONE_ICON: Record<ToastTone, ReactNode> = {
  info: <Info size={18} className="text-info" />,
  success: <CheckCircle2 size={18} className="text-success" />,
  warning: <AlertCircle size={18} className="text-warning" />,
  error: <XCircle size={18} className="text-error" />,
};

/**
 * Provider — mount once near the root of the app. Children call `useToast()`
 * to push toasts. Renders a top-right stack that slides in then auto-dismisses.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) clearTimeout(tm);
    timersRef.current.delete(id);
  }, []);

  const push = useCallback(
    (input: Omit<Toast, "id">) => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const t: Toast = { id, tone: "info", durationMs: 5000, ...input };
      setToasts((list) => [...list, t]);
      const tm = setTimeout(() => dismiss(id), t.durationMs);
      timersRef.current.set(id, tm);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              role="alert"
              layout
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="glass-heavy pointer-events-auto !rounded-xl p-3.5 flex items-start gap-3"
            >
              <span className="shrink-0 mt-0.5">{TONE_ICON[t.tone ?? "info"]}</span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold text-body-sm text-neutral-900">
                  {t.title}
                </p>
                {t.description && (
                  <p className="text-body-sm text-neutral-500 mt-0.5 leading-relaxed">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
                className={clsx(
                  "shrink-0 grid place-items-center w-7 h-7 rounded-md text-neutral-400",
                  "hover:bg-neutral-100 hover:text-neutral-700 transition",
                )}
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside <ToastProvider>");
  return v;
}
