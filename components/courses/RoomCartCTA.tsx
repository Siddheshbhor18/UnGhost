"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useHasMounted } from "@/components/lib/useHasMounted";
import { AddToCartButton } from "@/components/courses/AddToCartButton";
import { useCourseCart } from "@/components/courses/cartStore";
import type { BootcampCategory } from "@/shared/rooms";
import { COURSE_PRICE_PAISE } from "@/shared/lib/courses";
import { formatPaiseAsINR } from "@/shared/lib/pricing";

interface Props {
  id: BootcampCategory;
  label: string;
  /** When true the buyer already owns this course — replaces the add-to-cart
   *  toggle with an "Owned" badge + a link into the room hub. */
  owned?: boolean;
}

/**
 * Inline cart action for `/bootcamps/[room]` — surfaces the room's price and
 * an add-to-cart toggle right under the title, with a contextual "View cart"
 * shortcut once anything is in the cart so buyers can hop straight to
 * checkout without scrolling back up to the navbar.
 *
 * Mounted-guarded — the "View cart" shortcut hangs off the persisted cart
 * count, and we don't want it flashing in during hydration.
 */
export function RoomCartCTA({ id, label, owned = false }: Props) {
  const itemCount = useCourseCart((s) => s.items.length);
  const mounted = useHasMounted();
  const showViewCart = mounted && itemCount > 0;

  if (owned) {
    return (
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-body-sm font-semibold text-emerald-800">
            You own the {label} course.
          </p>
          <p className="mt-0.5 text-body-xs text-emerald-700/80">
            Access is live for the rest of your 3-month window — jump in below.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:self-auto"
        >
          Go to my courses <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-brand-200 bg-white/70 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-body-sm font-semibold text-brand-ink">
          {label} course ·{" "}
          <span className="tnum">{formatPaiseAsINR(COURSE_PRICE_PAISE)}</span>
          <span className="ml-1 text-body-xs font-normal text-brand-muted">
            · 3 months access
          </span>
        </p>
        <p className="mt-0.5 text-body-xs text-brand-muted">
          Add to cart and stack other rooms — free unlocks apply automatically
          at checkout.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AddToCartButton id={id} size="md" />
        {showViewCart ? (
          <Link
            href="/bootcamps/checkout"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-brand-primary transition hover:gap-2"
          >
            View cart ({itemCount}) <ArrowRight size={15} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
