"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Activity,
  Users,
  Building2,
  GraduationCap,
  Award,
  FileSearch,
  ShieldAlert,
  TrendingUp,
  Megaphone,
  Power,
  Briefcase,
  IndianRupee,
  LifeBuoy,
  MailOpen,
  Plug,
  Handshake,
  Wallet,
  Radio,
  Video,
  Sparkles,
  Coins,
  Banknote,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Logo, GlassBadge } from "@/components/glass";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Always-visible top-level destinations — the daily entry points. */
const OVERVIEW: NavItem[] = [
  { href: "/admin/today", label: "Today", icon: Activity },
  { href: "/admin/metrics", label: "Metrics", icon: TrendingUp },
];

/** The remaining 21 destinations, grouped by operating domain. A 24-item
 *  flat list made every task a scan; groups collapse to the one you're in. */
const GROUPS: NavGroup[] = [
  {
    label: "People",
    items: [
      { href: "/admin/students", label: "Students", icon: Users },
      { href: "/admin/recruiters", label: "Recruiters", icon: Users },
      { href: "/admin/companies", label: "Companies", icon: Building2 },
      { href: "/admin/placements", label: "Placements", icon: Award },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
      { href: "/admin/bootcamps", label: "Bootcamps", icon: GraduationCap },
      { href: "/admin/lectures", label: "Lectures", icon: Video },
      { href: "/admin/live-sessions", label: "Live sessions", icon: Radio },
    ],
  },
  {
    label: "Revenue",
    items: [
      { href: "/admin/financial", label: "Financial", icon: IndianRupee },
      { href: "/admin/payment-approvals", label: "Payment approvals", icon: Wallet },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
      { href: "/admin/partners", label: "Partners", icon: Handshake },
      { href: "/admin/creators", label: "Creators", icon: Sparkles },
      { href: "/admin/rewards", label: "Creator rewards", icon: Coins },
      { href: "/admin/payouts", label: "Creator payouts", icon: Banknote },
    ],
  },
  {
    label: "Trust & safety",
    items: [
      { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
      { href: "/admin/support", label: "Support", icon: LifeBuoy },
      { href: "/admin/audit", label: "Audit log", icon: FileSearch },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/emails", label: "Email templates", icon: MailOpen },
      { href: "/admin/telemetry", label: "Telemetry", icon: TrendingUp },
      { href: "/admin/integrations", label: "Integrations", icon: Plug },
    ],
  },
];

/** localStorage key for the user's manual open/closed group choices. */
const OPEN_GROUPS_KEY = "unghost:admin:nav-open";

function groupOfPath(path: string): string | null {
  for (const group of GROUPS) {
    if (group.items.some((item) => path.startsWith(item.href))) return group.label;
  }
  return null;
}

export function AdminSidebar() {
  const path = usePathname() ?? "";
  const { data: session } = useSession();
  const activeGroup = groupOfPath(path);

  // Default: only the group holding the current page is open. Manual toggles
  // persist across visits; the active group is always forced open so the
  // current location is never hidden.
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    activeGroup ? { [activeGroup]: true } : {},
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(OPEN_GROUPS_KEY);
      if (stored) {
        setOpen((current) => ({
          ...(JSON.parse(stored) as Record<string, boolean>),
          ...current,
        }));
      }
    } catch {
      // Corrupt/unavailable storage — defaults are fine.
    }
  }, []);

  function toggle(label: string): void {
    setOpen((current) => {
      const next = { ...current, [label]: !current[label] };
      try {
        localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(next));
      } catch {
        // Storage full/blocked — the toggle still works for this session.
      }
      return next;
    });
  }

  return (
    <aside className="bg-white/65 backdrop-blur-2xl border-r border-white/60 min-h-screen w-64 shrink-0 flex flex-col shadow-glass">
      <div className="flex items-center justify-between px-5 py-5 border-b border-brand-ink/5">
        <Logo size="sm" />
        <GlassBadge tone="warn">Admin</GlassBadge>
      </div>
      <div className="px-5 py-4 border-b border-brand-ink/5">
        <p className="text-[10px] uppercase tracking-wider text-brand-muted font-semibold">
          Signed in as
        </p>
        <p className="text-sm text-brand-ink font-semibold mt-1">{session?.user?.name}</p>
        <p className="text-xs text-brand-muted truncate">{session?.user?.email}</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {OVERVIEW.map((item) => (
          <NavLink key={item.href} item={item} active={path.startsWith(item.href)} />
        ))}

        {GROUPS.map((group) => {
          const isActiveGroup = group.label === activeGroup;
          const isOpen = isActiveGroup || open[group.label] === true;
          return (
            <div key={group.label} className="mt-3">
              <button
                type="button"
                onClick={() => toggle(group.label)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between rounded-lg px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-brand-muted transition hover:text-brand-ink"
              >
                {group.label}
                <ChevronDown
                  size={13}
                  className={clsx(
                    "transition-transform duration-200 motion-reduce:transition-none",
                    isOpen ? "rotate-0" : "-rotate-90",
                  )}
                />
              </button>
              {isOpen && (
                <div>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={path.startsWith(item.href)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-brand-ink/5">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="btn-glass w-full justify-center !text-rose-600 hover:!text-rose-700"
        >
          <Power size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={clsx(
        "flex items-center gap-3 px-3.5 py-2 my-0.5 rounded-xl text-sm font-medium transition",
        active
          ? "bg-brand-primary text-white shadow-brand-glow"
          : "text-brand-ink/70 hover:bg-white/60 hover:text-brand-ink",
      )}
    >
      <Icon size={16} />
      <span>{item.label}</span>
    </Link>
  );
}
