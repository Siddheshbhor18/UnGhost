"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";
import {
  Coins,
  Home,
  LogOut,
  Megaphone,
  Settings,
  Wallet,
} from "lucide-react";
import { AppNav, Button, type AppNavItem } from "@/components/ui";

const NAV: (AppNavItem & { mobileIcon: ReactNode })[] = [
  {
    href: "/creatordashboard",
    label: "Home",
    exact: true,
    icon: <Home size={16} />,
    mobileIcon: <Home size={20} />,
  },
  {
    href: "/creatordashboard/rewards",
    label: "Rewards",
    icon: <Coins size={16} />,
    mobileIcon: <Coins size={20} />,
  },
  {
    href: "/creatordashboard/campaigns",
    label: "Campaigns",
    icon: <Megaphone size={16} />,
    mobileIcon: <Megaphone size={20} />,
  },
  {
    href: "/creatordashboard/payouts",
    label: "Payouts",
    icon: <Wallet size={16} />,
    mobileIcon: <Wallet size={20} />,
  },
  {
    href: "/creatordashboard/settings",
    label: "Settings",
    icon: <Settings size={16} />,
    mobileIcon: <Settings size={20} />,
  },
];

/**
 * Isolated creator-portal chrome: brand header with desktop nav, a mobile
 * bottom tab bar (big tap targets), and the centred content column. No admin
 * sidebar, no main-platform nav — this shell stands alone (design rule §5).
 */
export function CreatorShell({ children }: { children: ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppNav
        brand={
          <Link
            href="/creatordashboard"
            className="font-display text-lg font-bold tracking-tight text-brand-ink"
          >
            unGhost <span className="text-brand-500">· Creator</span>
          </Link>
        }
        items={NAV}
        trailing={
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<LogOut size={15} />}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        }
      />

      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-2 md:max-w-3xl md:pb-16">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-neutral-0/95 backdrop-blur-md [padding-bottom:env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const active = item.exact
              ? path === item.href
              : Boolean(path?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-brand-500"
                    : "text-neutral-500 hover:text-neutral-800",
                )}
              >
                {item.mobileIcon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
