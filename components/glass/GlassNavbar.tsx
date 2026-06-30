"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import clsx from "clsx";
import { GlassButton } from "./GlassButton";
import { NotificationBell } from "./NotificationBell";
import { AccountMenu } from "./AccountMenu";
import { MobileTabBar } from "./MobileTabBar";
import { NavCartButton } from "@/components/courses/NavCartButton";

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
    { href: "/", label: "Who We Are", exact: true },
    { href: "/bootcamps", label: "Bootcamps" },
    { href: "/recruiters", label: "For Recruiters" },
  ],
  student: [
    { href: "/dashboard", label: "Today" },
    { href: "/student/jobs", label: "Jobs" },
    { href: "/student/applications", label: "Applications" },
    { href: "/student/messages", label: "Messages" },
    { href: "/bootcamps", label: "Bootcamps" },
    { href: "/student/live", label: "Live" },
    { href: "/student/coach", label: "AI Coach" },
    // Profile + Settings live in the account dropdown (avatar, top-right),
    // not the center nav — keeps them in one place across desktop + mobile.
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

// Session-scoped cache of the live premium check. The navbar is rendered
// per-page (not in a shared layout), so it remounts on every route change.
// Without this cache the initial state was non-premium and the pulsing "Go
// Premium" CTA flashed in for a split second on every section switch — even for
// paying users. Seeding state from the cache (client-only; never written during
// SSR) makes remounts render the known status synchronously, so there's no
// flash. We still revalidate on each mount (stale-while-revalidate) so a
// mid-session plan change — or a logout→login in the same tab — is picked up;
// the refetch only updates when the value actually changed, so it can't flash.
let cachedPremium: boolean | null = null;

export function GlassNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname() ?? "/";
  const role = session?.user?.role;

  // Live premium check — once a student upgrades we hide the "Go Premium" CTA
  // (showing it to a paying user is bad UX). Read from the DB, not the JWT,
  // since premium is activated by admin approval after sign-in.
  //
  // `null` = not yet known. We render the CTA only when we KNOW the student is
  // non-premium (`=== false`), so a premium user never sees it flash before the
  // check resolves.
  const [isPremium, setIsPremium] = useState<boolean | null>(cachedPremium);
  useEffect(() => {
    if (role !== "student") return;
    let cancelled = false;
    // Always revalidate. The initial render already used the cached value, so
    // re-checking can only correct a stale flag (never flash). On a network or
    // HTTP error we keep the last known value rather than flipping to a guess.
    fetch("/api/student/plan")
      .then((r) => (r.ok ? (r.json() as Promise<{ premium?: boolean }>) : null))
      .then((d) => {
        if (!d || cancelled) return;
        const premium = Boolean(d.premium);
        cachedPremium = premium;
        setIsPremium(premium);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [role]);
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
    <>
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
                {role === "student" && isPremium === false && (
                  <Link href="/upgrade" className="premium-attn hidden sm:inline-block">
                    <GlassButton
                      variant="brand"
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      <Sparkles size={13} /> Go Premium
                    </GlassButton>
                  </Link>
                )}
                {role === "student" ? <NavCartButton /> : null}
                <NotificationBell />
                <AccountMenu
                  name={session.user?.name}
                  email={session.user?.email}
                  image={session.user?.image}
                  role={role}
                />
              </>
            ) : (
              <>
                {/* Landing-page conversion CTA. Routes through /upgrade, which
                    gates anon visitors to sign in first. Pulses every 5s to
                    draw the eye; sm+ only so the mobile pill doesn't overflow. */}
                <Link href="/upgrade" className="premium-attn hidden sm:inline-block">
                  <GlassButton
                    variant="brand"
                    size="sm"
                    className="whitespace-nowrap"
                  >
                    <Sparkles size={13} /> Go Premium
                  </GlassButton>
                </Link>
                <NavCartButton />
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
    {session && items.length > 0 && (
      <MobileTabBar items={items} pathname={pathname} />
    )}
    </>
  );
}
