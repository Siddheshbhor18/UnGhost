"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export interface AppNavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  /** Exact path match — defaults to startsWith. */
  exact?: boolean;
}

export interface AppNavProps {
  /** Logo / wordmark slot at far left. */
  brand: ReactNode;
  /** Centred nav links. */
  items?: AppNavItem[];
  /** Far-right slot — search bar, account menu, CTAs. */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Top navigation bar — transparent at scroll-top, becomes light glass on
 * scroll. Active route gets a brand-500 underline. Per design-system spec.
 */
export function AppNav({ brand, items = [], trailing, className }: AppNavProps) {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "sticky top-0 z-40 transition-all duration-fast ease-out-soft",
        scrolled ? "py-2" : "py-3",
        className,
      )}
    >
      <div className="mx-auto max-w-content-wide px-4">
        <nav
          className={clsx(
            "flex items-center justify-between gap-4 px-5 py-2.5 transition-all duration-fast",
            scrolled
              ? "glass !rounded-2xl shadow-elev-3"
              : "bg-transparent rounded-2xl",
          )}
        >
          <div className="shrink-0">{brand}</div>

          {items.length > 0 && (
            <div className="hidden md:flex items-center gap-1 text-body-sm font-medium text-neutral-700">
              {items.map((it) => {
                const active = it.exact
                  ? path === it.href
                  : path?.startsWith(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={clsx(
                      "relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition",
                      active
                        ? "text-brand-500"
                        : "hover:text-neutral-900 hover:bg-neutral-50",
                    )}
                  >
                    {it.icon}
                    {it.label}
                    {active && (
                      <span className="absolute left-3 right-3 -bottom-1 h-0.5 rounded-full bg-brand-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          <div className="shrink-0 flex items-center gap-2">{trailing}</div>
        </nav>
      </div>
    </header>
  );
}
