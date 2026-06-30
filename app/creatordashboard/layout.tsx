import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import { ToastProvider } from "@/components/ui";
import { minPayoutPaise } from "@/server/creator/types";
import { CreatorConfigProvider } from "./_components/CreatorConfig";
import { CreatorShell } from "./_components/CreatorShell";

// The dashboard reads live per-creator data and is auth-gated — never
// statically prerendered.
export const dynamic = "force-dynamic";

/**
 * Isolated creator-portal shell. A logged-in non-creator is bounced to /login;
 * a creator gets the full chrome. Unauthenticated requests fall through to the
 * children so the public token page (`/creatordashboard/activate`) keeps
 * working pre-login — every protected page re-checks via its API (403 → a
 * friendly "please log in" state).
 */
export default async function CreatorDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (session && session.user.role !== "creator") redirect("/login");
  const isCreator = Boolean(session && session.user.role === "creator");

  return (
    <ToastProvider>
      <CreatorConfigProvider value={{ minPayoutPaise: minPayoutPaise() }}>
        {isCreator ? (
          <CreatorShell>{children}</CreatorShell>
        ) : (
          <div className="min-h-screen bg-neutral-50">{children}</div>
        )}
      </CreatorConfigProvider>
    </ToastProvider>
  );
}
