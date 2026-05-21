import type { Metadata } from "next";
import Link from "next/link";
import { Ghost, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "unGhost · Partner Portal",
  description: "Channel partner dashboard",
  // Belt-and-suspenders: even though robots.txt blocks /p/*, also send the
  // noindex header so any indexer that ignores robots still gets the hint.
  robots: { index: false, follow: false },
};

/**
 * Layout for the channel-partner portal. Deliberately separated from the
 * main app chrome — no GlassNavbar, no BackdropMesh, no marketing links.
 * Wordmark links back to the partner's own dashboard, never to the public
 * platform, so they can't accidentally drop into the student/recruiter app.
 */
export default function PartnerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-neutral-900 text-white">
              <Ghost size={16} />
            </span>
            <span className="font-display font-bold text-lg text-neutral-900">
              unGhost <span className="text-neutral-400">·</span>{" "}
              <span className="text-brand-primary font-semibold">Partner Portal</span>
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500">
            <ShieldCheck size={12} /> Private dashboard
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-3 flex items-center justify-between text-[11px] text-neutral-500">
          <span>© unGhost Technologies. Partner Portal.</span>
          <Link
            href="mailto:partners@unghost.in"
            className="hover:text-neutral-900 transition"
          >
            partners@unghost.in
          </Link>
        </div>
      </footer>
    </div>
  );
}
