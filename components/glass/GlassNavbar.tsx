"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { GlassButton } from "./GlassButton";
import { NotificationBell } from "./NotificationBell";

/**
 * Top navigation bar (glass). Single source of truth for in-app wayfinding.
 *
 * Active-section indicator: a `layoutId`-shared pill morphs underneath
 * whichever nav item matches the current `usePathname()`. Framer-motion
 * handles the position + width interpolation when the active item changes,
 * so route transitions feel responsive even before the new page renders.
 *
 * Active match rules (per item):
 *   • `exact: true`  → strict equality with `pathname`. Used for "/" links
 *     so the home pill doesn't light up on every nested route.
 *   • default        → equality OR `pathname.startsWith(href + "/")`. Keeps
 *     "Applications" highlighted while you're on `/student/applications/123`.
 */

type NavItem = { href: string; label: string; exact?: boolean };

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  anon: [
    { href: "/", label: "Missions", exact: true },
    { href: "/bootcamps", label: "Bootcamps" },
    { href: "/recruiter/login", label: "For Recruiters" },
  ],
  student: [
    { href: "/dashboard", label: "Today" },
    { href: "/student/applications", label: "Applications" },
    { href: "/student/messages", label: "Messages" },
    { href: "/student/saved", label: "Saved" },
    { href: "/bootcamps", label: "Bootcamps" },
    { href: "/student/live", label: "Live" },
    { href: "/student/coach", label: "AI Coach" },
    { href: "/student/profile", label: "Profile" },
  ],
  instructor: [
    { href: "/instructor/today", label: "Today" },
    { href: "/instructor/studio", label: "Studio" },
    { href: "/instructor/live", label: "Live" },
    { href: "/instructor/recordings", label: "Recordings" },
  ],
  recruiter: [
    { href: "/recruiter/today", label: "Today" },
    { href: "/recruiter/command", label: "Pipeline" },
    { href: "/recruiter/candidates", label: "Database" },
    { href: "/recruiter/messages", label: "Messages" },
    { href: "/recruiter/analytics", label: "Analytics" },
    { href: "/recruiter/deploy", label: "Post Job" },
    { href: "/recruiter/lectures", label: "Lectures" },
  ],
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function GlassNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname() ?? "/";
  const role = session?.user?.role;
  const homeHref =
    role === "recruiter"
      ? "/recruiter/today"
      : role === "admin"
      ? "/admin/today"
      : role === "instructor"
      ? "/instructor/today"
      : role === "student"
      ? "/dashboard"
      : "/";

  const items =
    role && NAV_BY_ROLE[role]
      ? NAV_BY_ROLE[role]
      : !session
      ? NAV_BY_ROLE.anon
      : [];

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <nav className="glass-panel flex items-center justify-between gap-2 px-4 sm:px-5 py-3">
          <Link href={homeHref} className="flex items-center gap-2 group">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand-gradient shadow-brand-glow transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5 group-hover:rotate-[-4deg] motion-reduce:transition-none motion-reduce:transform-none">
              <img
                src="/symbol.svg"
                alt="unGhost"
                width={22}
                height={22}
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </span>
            <span className="font-display font-bold text-lg text-brand-ink">
              un<span className="logo-sweep">Ghost</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 text-sm font-medium">
            {items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "relative px-3 py-1.5 rounded-lg transition-colors",
                    active
                      ? "text-brand-primary"
                      : "text-brand-muted hover:text-brand-ink",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="navbar-active-pill"
                      className="absolute inset-0 rounded-lg bg-brand-primary/10 border border-brand-primary/25 shadow-[inset_0_0_0_1px_rgba(1,145,252,0.05)]"
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 34,
                        mass: 0.7,
                      }}
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {session ? (
              <>
                <NotificationBell />
                <span className="hidden sm:inline text-xs font-medium text-brand-muted">
                  {session.user?.name}
                </span>
                <GlassButton
                  variant="glass"
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  Sign out
                </GlassButton>
              </>
            ) : (
              <>
                {/* Phones: a compact text link (the button chrome is what
                    overflows the pill beside the logo at ≤375px). sm+: the
                    full glass button. */}
                <Link
                  href="/login"
                  className="sm:hidden whitespace-nowrap px-1.5 py-1.5 text-sm font-semibold text-brand-ink"
                >
                  Sign in
                </Link>
                <Link href="/login" className="hidden sm:block">
                  <GlassButton variant="glass" size="sm" className="whitespace-nowrap">
                    Sign in
                  </GlassButton>
                </Link>
                <Link href="/signup">
                  <GlassButton variant="brand" size="sm" className="whitespace-nowrap">
                    Get started
                  </GlassButton>
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
