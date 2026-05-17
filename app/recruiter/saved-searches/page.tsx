import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Bell } from "lucide-react";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassNavbar,
} from "@/components/glass";
import { listSavedSearches } from "@/server/store";
import { SavedSearchesClient } from "@/components/recruiter/SavedSearchesClient";

export default async function SavedSearchesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?role=recruiter");
  if (session.user.role !== "recruiter") redirect("/");

  const list = await listSavedSearches(session.user.id);

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <div className="mb-6">
          <GlassBadge tone="brand">
            <Bell size={11} /> Saved searches
          </GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Your candidate radar
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Pin filter combos · set an alert frequency · we ping you when new
            candidates match. {list.length} saved.
          </p>
        </div>
        <SavedSearchesClient initial={list} />
      </div>
    </main>
  );
}
