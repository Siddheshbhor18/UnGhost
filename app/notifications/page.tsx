import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth";
import {
  BlobField,
  GlassBadge,
  GlassNavbar,
} from "@/components/glass";
import { listNotifications } from "@/server/store";
import { NotificationsInbox } from "@/components/student/NotificationsInbox";

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login?next=/notifications");

  const items = await listNotifications(session.user.id, { limit: 100 });

  return (
    <main className="relative min-h-screen">
      <BlobField />
      <GlassNavbar />
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-12">
        <div className="mb-6">
          <GlassBadge tone="brand">Inbox</GlassBadge>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-brand-ink mt-2">
            Notifications
          </h1>
          <p className="text-sm text-brand-muted mt-1">
            Every event that touches your account — SLA breaches, grades, offers,
            messages. Real-time.
          </p>
        </div>
        <NotificationsInbox initial={items} />
      </div>
    </main>
  );
}
