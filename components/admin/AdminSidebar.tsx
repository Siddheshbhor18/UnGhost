"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Activity,
  Users,
  Building2,
  GraduationCap,
  Award,
  TrendingUp,
  Megaphone,
  Power,
  Ghost,
} from "lucide-react";
import { Badge } from "@/components/arcade/Badge";

const NAV = [
  { href: "/admin/metrics", label: "Overview", icon: Activity, color: "text-neon-green" },
  { href: "/admin/students", label: "Students", icon: Users, color: "text-neon-blue" },
  { href: "/admin/recruiters", label: "Recruiters", icon: Building2, color: "text-neon-pink" },
  { href: "/admin/bootcamps", label: "Bootcamps", icon: GraduationCap, color: "text-neon-yellow" },
  { href: "/admin/placements", label: "Placements", icon: Award, color: "text-neon-purple" },
  { href: "/admin/telemetry", label: "Telemetry", icon: TrendingUp, color: "text-neon-red" },
  { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone, color: "text-neon-orange" },
];

export function AdminSidebar() {
  const path = usePathname();
  const { data: session } = useSession();
  return (
    <aside className="border-r-2 border-bg-ink bg-bg-panel min-h-screen w-60 shrink-0 flex flex-col">
      <Link href="/" className="flex items-center gap-2 border-b-2 border-bg-ink px-4 py-4">
        <Ghost size={20} className="text-neon-pink" />
        <span className="font-pixel text-xs neon-text text-neon-pink">NO/GHOST</span>
        <Badge tone="yellow" className="ml-auto">ADMIN</Badge>
      </Link>
      <div className="px-4 py-3 border-b-2 border-bg-ink">
        <p className="font-pixel text-[9px] text-ink-muted">SIGNED IN AS</p>
        <p className="font-pixel text-xs text-neon-yellow mt-1">{session?.user?.name}</p>
        <p className="font-mono text-[10px] text-ink-dim">{session?.user?.email}</p>
      </div>
      <nav className="p-2 flex-1">
        {NAV.map((n) => {
          const active = path?.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 px-3 py-2 my-1 border-2 transition-colors ${
                active
                  ? "border-neon-yellow bg-neon-yellow/10 text-neon-yellow"
                  : "border-transparent text-ink-muted hover:border-bg-ink hover:text-ink-primary"
              }`}
            >
              <Icon size={14} className={active ? "" : n.color} />
              <span className="font-pixel text-[11px]">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t-2 border-bg-ink">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-2 border-2 border-neon-red text-neon-red py-2 font-pixel text-[10px] hover:bg-neon-red hover:text-black transition-colors"
        >
          <Power size={12} /> SIGN OUT
        </button>
      </div>
    </aside>
  );
}
