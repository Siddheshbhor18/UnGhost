"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { GlassButton } from "./GlassButton";
import { NotificationBell } from "./NotificationBell";

export function GlassNavbar() {
  const { data: session } = useSession();
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

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 pt-4">
        <nav className="glass-panel flex items-center justify-between px-5 py-3">
          <Link href={homeHref} className="flex items-center gap-2 group">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-brand-gradient shadow-brand-glow">
              <img
                src="/symbol.svg"
                alt="unGhost"
                width={22}
                height={22}
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </span>
            <span className="font-display font-bold text-lg text-brand-ink">
              un<span className="text-brand-gradient">Ghost</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 text-sm font-medium text-brand-muted">
            {!session && (
              <>
                <Link href="/" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Missions
                </Link>
                <Link href="/bootcamps" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Bootcamps
                </Link>
                <Link href="/recruiter/login" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  For Recruiters
                </Link>
              </>
            )}
            {role === "student" && (
              <>
                <Link href="/dashboard" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Today
                </Link>
                <Link href="/student/applications" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Applications
                </Link>
                <Link href="/student/messages" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Messages
                </Link>
                <Link href="/student/saved" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Saved
                </Link>
                <Link href="/bootcamps" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Bootcamps
                </Link>
                <Link href="/student/live" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Live
                </Link>
                <Link href="/student/coach" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  AI Coach
                </Link>
                <Link href="/student/profile" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Profile
                </Link>
              </>
            )}
            {role === "instructor" && (
              <>
                <Link href="/instructor/today" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Today
                </Link>
                <Link href="/instructor/studio" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Studio
                </Link>
                <Link href="/instructor/live" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Live
                </Link>
                <Link href="/instructor/recordings" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Recordings
                </Link>
              </>
            )}
            {role === "recruiter" && (
              <>
                <Link href="/recruiter/today" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Today
                </Link>
                <Link href="/recruiter/command" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Pipeline
                </Link>
                <Link href="/recruiter/candidates" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Database
                </Link>
                <Link href="/recruiter/messages" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Messages
                </Link>
                <Link href="/recruiter/analytics" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Analytics
                </Link>
                <Link href="/recruiter/deploy" className="px-3 py-1.5 rounded-lg hover:text-brand-ink hover:bg-white/40 transition">
                  Post Job
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <>
                <NotificationBell />
                <span className="hidden sm:inline text-xs font-medium text-brand-muted">
                  {session.user?.name}
                </span>
                <GlassButton variant="glass" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                  Sign out
                </GlassButton>
              </>
            ) : (
              <>
                <Link href="/login">
                  <GlassButton variant="glass" size="sm">Sign in</GlassButton>
                </Link>
                <Link href="/signup">
                  <GlassButton variant="brand" size="sm">Get started</GlassButton>
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
