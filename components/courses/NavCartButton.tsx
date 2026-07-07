"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import clsx from "clsx";
import { useHasMounted } from "@/components/lib/useHasMounted";
import { useCourseCart } from "@/components/courses/cartStore";

interface Props {
  className?: string;
  /** Render nothing until the cart has items — keeps chrome out of nav
   *  surfaces (e.g. anonymous marketing pages) where an empty cart is noise. */
  hideWhenEmpty?: boolean;
}

/**
 * Navbar cart pill — surfaces the live course-cart count and routes to the
 * cart on click. Renders the badge only when there's at least one course in
 * the cart so empty nav stays uncluttered.
 *
 * The badge is mounted-guarded so the persisted (localStorage) cart never
 * trips a hydration mismatch on the server-rendered nav.
 *
 * The link target (`/bootcamps/checkout`) is the same for anon + student.
 * Anon visitors get redirected to `/login?next=/bootcamps/checkout` by the
 * cart page's server guard, so they land back on the cart after sign-in.
 */
export function NavCartButton({ className, hideWhenEmpty }: Props) {
  const count = useCourseCart((s) => s.items.length);
  const mounted = useHasMounted();
  const live = mounted ? count : 0;

  if (hideWhenEmpty && live === 0) return null;

  return (
    <Link
      href="/bootcamps/checkout"
      aria-label={
        live > 0
          ? `Cart — ${live} ${live === 1 ? "course" : "courses"}`
          : "Cart"
      }
      className={clsx(
        "relative grid h-9 w-9 place-items-center rounded-full text-brand-ink transition hover:bg-black/5",
        className,
      )}
    >
      <ShoppingBag size={18} strokeWidth={2} />
      {live > 0 ? (
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold tnum text-white ring-2 ring-white"
        >
          {live > 9 ? "9+" : live}
        </span>
      ) : null}
    </Link>
  );
}
