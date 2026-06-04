"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import clsx from "clsx";

interface AccountMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

/** First+last initial, falling back to the email's first letter. */
function initials(name?: string | null, email?: string | null): string {
  const src = (name ?? "").trim();
  if (src) {
    const parts = src.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || src[0]!.toUpperCase();
  }
  return (email?.[0] ?? "U").toUpperCase();
}

/**
 * Avatar trigger + account dropdown. Replaces the old inline
 * "name text + Sign out button" cluster in the navbar. Holds the account
 * actions (Profile, Settings, Sign out) behind one avatar, freeing the bar.
 *
 * Profile/Settings links are shown only for students (the paths we know
 * exist); other roles get name + Sign out, matching prior behaviour.
 *
 * Pattern mirrors NotificationBell: relative wrapper, outside-click close,
 * z-50 floating panel. Adds Escape-to-close + role="menu" semantics.
 */
export function AccountMenu({ name, email, image, role }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isStudent = role === "student";

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 hover:bg-white/60 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <span className="grid place-items-center w-8 h-8 rounded-full bg-brand-gradient text-white text-xs font-bold shadow-brand-glow overflow-hidden">
          {image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={image}
              alt=""
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            initials(name, email)
          )}
        </span>
        <ChevronDown
          size={14}
          className={clsx(
            "text-brand-muted transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-56 z-50">
          <div className="rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/60 shadow-glass-lg overflow-hidden py-1">
            <div className="px-4 py-3 border-b border-brand-ink/5">
              <p className="font-display font-semibold text-sm text-brand-ink truncate">
                {name ?? "Your account"}
              </p>
              {email && (
                <p className="text-xs text-brand-muted truncate">{email}</p>
              )}
            </div>

            {isStudent && (
              <>
                <MenuLink
                  href="/student/profile"
                  icon={<User size={15} />}
                  label="Profile"
                  onNavigate={() => setOpen(false)}
                />
                <MenuLink
                  href="/student/settings"
                  icon={<Settings size={15} />}
                  label="Settings"
                  onNavigate={() => setOpen(false)}
                />
                <div className="my-1 border-t border-brand-ink/5" />
              </>
            )}

            <button
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition text-left"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-brand-ink hover:bg-brand-primary/5 transition"
    >
      <span className="text-brand-muted">{icon}</span>
      {label}
    </Link>
  );
}
