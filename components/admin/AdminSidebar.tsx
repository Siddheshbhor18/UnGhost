"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
} from "lucide-react";
import { Logo, GlassBadge } from "@/components/glass";

const NAV = [
  { href: "/admin/today", label: "Today", icon: Activity },
  { href: "/admin/metrics", label: "Metrics", icon: TrendingUp },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/recruiters", label: "Recruiters", icon: Users },
  { href: "/admin/companies", label: "Companies", icon: Building2 },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/bootcamps", label: "Bootcamps", icon: GraduationCap },
  { href: "/admin/lectures", label: "Lectures", icon: Video },
  { href: "/admin/placements", label: "Placements", icon: Award },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/admin/financial", label: "Financial", icon: IndianRupee },
  { href: "/admin/payment-approvals", label: "Payment approvals", icon: Wallet },
  { href: "/admin/live-sessions", label: "Live sessions", icon: Radio },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/emails", label: "Email templates", icon: MailOpen },
  { href: "/admin/audit", label: "Audit", icon: FileSearch },
  { href: "/admin/telemetry", label: "Telemetry", icon: TrendingUp },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/admin/partners", label: "Partners", icon: Handshake },
  { href: "/admin/creators", label: "Creators", icon: Sparkles },
  { href: "/admin/rewards", label: "Creator rewards", icon: Coins },
  { href: "/admin/payouts", label: "Creator payouts", icon: Banknote },
  { href: "/admin/integrations", label: "Integrations", icon: Plug },
];

export function AdminSidebar() {
  const path = usePathname();
  const { data: session } = useSession();
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
      <nav className="p-3 flex-1">
        {NAV.map((n) => {
          const active = path?.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "flex items-center gap-3 px-3.5 py-2.5 my-1 rounded-xl text-sm font-medium transition",
                active
                  ? "bg-brand-primary text-white shadow-brand-glow"
                  : "text-brand-ink/70 hover:bg-white/60 hover:text-brand-ink",
              )}
            >
              <Icon size={16} />
              <span>{n.label}</span>
            </Link>
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
