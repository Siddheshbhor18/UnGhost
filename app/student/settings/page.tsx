import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassNavbar,
} from "@/components/glass";
import { getUserById } from "@/server/store";
import { SettingsClient } from "@/components/student/SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/student/settings");
  if (session.user.role !== "student") redirect("/");

  const user = await getUserById(session.user.id);
  if (!user?.profile) redirect("/onboarding");

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <Link
          href="/student/profile"
          className="inline-flex items-center gap-1 text-sm text-brand-primary font-semibold mb-3"
        >
          <ChevronLeft size={14} /> Profile
        </Link>
        <div className="mb-6">
          <GlassBadge tone="brand">Settings</GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Privacy &amp; account
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Tied to DPDP Act. All data stored in Mumbai · ap-south-1.
          </p>
        </div>
        <SettingsClient user={user} />
      </div>
    </main>
  );
}
