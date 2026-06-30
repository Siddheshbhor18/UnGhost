"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CompetitionClient } from "@/components/student/CompetitionClient";
import type { User } from "@/shared/types";

/**
 * Competition page wrapper — client component.
 *
 * Builds a minimal User object from the NextAuth session so the page
 * works without a server-component getServerSession call (which has
 * cookie-forwarding issues on Next.js 14 + Turbopack client-side
 * navigations).
 */
export default function CompetitionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-sm text-neutral-500 font-medium">Loading competition…</p>
        </div>
      </main>
    );
  }

  if (!session) {
    router.replace("/login?next=/competitions");
    return null;
  }

  if (session.user.role !== "student") {
    router.replace("/dashboard");
    return null;
  }

  // Build a minimal User from session — CompetitionClient only needs
  // id, name, email, and profile.contactPhone for the registration form.
  const user: User = {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: session.user.role as "student",
    passwordHash: "",
    plan: "free",
  } as User;

  return <CompetitionClient user={user} />;
}
