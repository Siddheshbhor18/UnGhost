"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { PixelButton } from "@/components/arcade/PixelButton";
import { Badge } from "@/components/arcade/Badge";
import { Ghost, Power } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  return (
    <nav className="sticky top-0 z-50 border-b-2 border-bg-ink/60 bg-bg-base/80 backdrop-blur supports-[backdrop-filter]:bg-bg-base/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-neon-pink group-hover:scale-110 transition-transform">
            <Ghost size={28} strokeWidth={1.6} />
          </span>
          <span className="font-pixel text-sm neon-text text-neon-pink">NO/GHOST</span>
          <Badge tone="green">BETA</Badge>
        </Link>
        <div className="flex items-center gap-3">
          {!session ? (
            <>
              <Link href="/recruiter/login" className="font-mono text-xs text-ink-muted hover:text-neon-blue">
                FOR RECRUITERS
              </Link>
              <Link href="/login">
                <PixelButton variant="pink" size="sm">
                  Unlock Career
                </PixelButton>
              </Link>
            </>
          ) : (
            <>
              <Badge tone={role === "admin" ? "yellow" : role === "recruiter" ? "blue" : "green"}>
                {role?.toUpperCase()} · {session.user?.name}
              </Badge>
              <Link href={role === "admin" ? "/admin/metrics" : role === "recruiter" ? "/recruiter/command" : "/dashboard"}>
                <PixelButton variant="ghost" size="sm">
                  Terminal
                </PixelButton>
              </Link>
              <PixelButton variant="red" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                <Power size={12} /> Logout
              </PixelButton>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
