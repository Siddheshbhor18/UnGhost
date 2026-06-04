"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  LayoutGrid,
  Briefcase,
  Send,
  MessageSquare,
  GraduationCap,
  Radio,
  Sparkles,
  User,
  Users,
  Columns,
  BarChart3,
  Video,
  Film,
  Compass,
  MoreHorizontal,
  Circle,
  type LucideIcon,
} from "lucide-react";
import { Drawer } from "@/components/ui";

type NavItem = { href: string; label: string; exact?: boolean };

/** Icon per route. Falls back to a dot if a new route isn't mapped. */
const ICON_BY_HREF: Record<string, LucideIcon> = {
  "/": Compass,
  "/dashboard": LayoutGrid,
  "/student/jobs": Briefcase,
  "/student/applications": Send,
  "/student/messages": MessageSquare,
  "/bootcamps": GraduationCap,
  "/student/live": Radio,
  "/student/coach": Sparkles,
  "/student/profile": User,
  "/recruiter/today": LayoutGrid,
  "/recruiter/command": Columns,
  "/recruiter/candidates": Users,
  "/recruiter/messages": MessageSquare,
  "/recruiter/analytics": BarChart3,
  "/recruiter/deploy": Send,
  "/recruiter/lectures": Video,
  "/instructor/today": LayoutGrid,
  "/instructor/studio": Video,
  "/instructor/live": Radio,
  "/instructor/recordings": Film,
  "/recruiter/login": Briefcase,
};

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

/**
 * Mobile bottom tab bar (md:hidden). The top navbar hides its center nav
 * below `md` with no fallback, so on a phone a signed-in user can't navigate
 * at all — this restores wayfinding with a thumb-reachable bar.
 *
 * Shows up to 5 destinations inline; if the role has more, the 5th slot is a
 * "More" tab opening a bottom sheet with the full list (nothing is orphaned).
 * Adds bottom padding to <body> while mounted so fixed-bar overlap is avoided.
 */
export function MobileTabBar({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Reserve space so the fixed bar never covers page content (mobile only).
  useEffect(() => {
    document.body.classList.add("has-mobile-nav");
    return () => document.body.classList.remove("has-mobile-nav");
  }, []);

  if (items.length === 0) return null;

  const hasOverflow = items.length > 5;
  const primary = hasOverflow ? items.slice(0, 4) : items.slice(0, 5);
  const overflow = hasOverflow ? items.slice(4) : [];
  const overflowActive = overflow.some((it) => isActive(pathname, it));

  return (
    <>
      <nav
        aria-label="Primary"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-brand-ink/10 bg-white/85 backdrop-blur-xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="flex items-stretch">
          {primary.map((item) => (
            <li key={item.href} className="flex-1">
              <TabLink item={item} active={isActive(pathname, item)} />
            </li>
          ))}
          {hasOverflow && (
            <li className="flex-1">
              <button
                onClick={() => setMoreOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={moreOpen}
                className={clsx(
                  "w-full flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
                  overflowActive
                    ? "text-brand-primary"
                    : "text-brand-muted hover:text-brand-ink",
                )}
              >
                <MoreHorizontal size={20} />
                <span className="text-[10px] font-medium leading-none">More</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      <Drawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        side="bottom"
        title="Menu"
      >
        <ul className="grid grid-cols-2 gap-2 pb-2">
          {items.map((item) => {
            const Icon = ICON_BY_HREF[item.href] ?? Circle;
            const active = isActive(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/25"
                      : "text-brand-ink hover:bg-brand-ink/5 border border-transparent",
                  )}
                >
                  <Icon size={18} className={active ? "text-brand-primary" : "text-brand-muted"} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </Drawer>
    </>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICON_BY_HREF[item.href] ?? Circle;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "relative w-full flex flex-col items-center justify-center gap-0.5 py-2 transition-colors",
        active ? "text-brand-primary" : "text-brand-muted hover:text-brand-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="mobile-tab-active"
          className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-primary"
          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
          aria-hidden="true"
        />
      )}
      <Icon size={20} />
      <span className="text-[10px] font-medium leading-none max-w-[68px] truncate">
        {item.label}
      </span>
    </Link>
  );
}
