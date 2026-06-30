"use client";

import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { Button, useToast, type ButtonSize, type ButtonVariant } from "@/components/ui";

/**
 * Copy-to-clipboard button with a one-tap toast confirmation (design rule §5:
 * "Copy-the-link is one tap, with a toast"). Briefly swaps its icon/label to a
 * check so the tap registers even before the toast lands.
 */
export function CopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  toastTitle = "Copied to clipboard",
  variant = "secondary",
  size = "md",
  fullWidth,
  iconOnly,
  className,
}: {
  value: string;
  label?: ReactNode;
  copiedLabel?: ReactNode;
  toastTitle?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  const { push } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      push({ tone: "success", title: toastTitle, description: value });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      push({
        tone: "error",
        title: "Couldn't copy",
        description: "Select the link and copy it manually.",
      });
    }
  }

  const icon = copied ? <Check size={15} /> : <Copy size={15} />;
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      className={className}
      leadingIcon={icon}
      onClick={copy}
      aria-label={iconOnly ? "Copy link" : undefined}
    >
      {!iconOnly && (copied ? copiedLabel : label)}
    </Button>
  );
}
