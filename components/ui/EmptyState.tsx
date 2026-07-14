import clsx from "clsx";
import type { ReactNode } from "react";
import { Ghost } from "lucide-react";

export interface EmptyStateProps {
  /** Headline — keep under 8 words. */
  title: string;
  /** Supporting copy — keep to 2 short sentences. */
  description?: string;
  /** Optional illustration (defaults to ghost mascot). */
  illustration?: ReactNode;
  /** Primary CTA node (Button or Link). */
  action?: ReactNode;
  /** Secondary CTA. */
  secondaryAction?: ReactNode;
  className?: string;
}

/**
 * Editorial empty state — centred composition, max 480px, ghost mascot
 * by default. Used on empty feeds, inboxes, lists.
 */
export function EmptyState({
  title,
  description,
  illustration,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "text-center mx-auto px-4 py-10",
        "max-w-[480px]",
        className,
      )}
    >
      <div className="mx-auto mb-5 grid place-items-center w-20 h-20 rounded-3xl bg-brand-50 text-brand-500">
        {illustration ?? (
          <Ghost size={36} strokeWidth={1.6} className="ghost-idle" />
        )}
      </div>
      <h2 className="font-display font-bold text-2xl text-neutral-900 tracking-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-body-md text-neutral-500 leading-relaxed">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
