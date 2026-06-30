"use client";

import { useState, type MouseEvent } from "react";
import { Copy, Check } from "lucide-react";
import clsx from "clsx";
import { useToast } from "@/components/ui";

/**
 * Icon button that copies a value to the clipboard and fires a confirmation
 * toast. Stops propagation so it can live inside a clickable table row without
 * triggering the row's navigation.
 */
export function CopyButton({
  value,
  toastTitle = "Link copied",
  title = "Copy referral link",
  className,
}: {
  value: string;
  toastTitle?: string;
  title?: string;
  className?: string;
}) {
  const { push } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      push({ title: toastTitle, description: value, tone: "success" });
    } catch {
      push({ title: "Couldn't copy", description: value, tone: "error" });
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={title}
      title={copied ? "Copied!" : title}
      className={clsx(
        "grid place-items-center w-8 h-8 rounded-lg border border-brand-ink/10 text-brand-muted hover:border-brand-ink/25 hover:bg-brand-ink/[0.04] hover:text-brand-ink transition shrink-0",
        className,
      )}
    >
      {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    </button>
  );
}
